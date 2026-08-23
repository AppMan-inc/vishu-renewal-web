import Busboy from "busboy";
import { getAuth } from "firebase-admin/auth";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { onRequest, type Request } from "firebase-functions/v2/https";
import {
  adminMutationSchema,
  applyAdminMutation,
  loadAdminSnapshot,
  type AdminMutation,
} from "../../../src/features/admin/server/admin-data";
import { isAdminDocumentForUid } from "../../../src/features/admin/admin-authorization";
import type {
  AdminRole,
  AdminSession,
} from "../../../src/features/admin/types";
import { adminAuth, adminFirestore, getFirebaseAdminApp } from "./firebase-admin-adapter";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export const adminApi = onRequest(
  {
    cors: true,
    invoker: "public",
    maxInstances: 5,
    memory: "512MiB",
    region: "asia-northeast2",
    timeoutSeconds: 60,
  },
  async (request, response) => {
    const requestId = requestIdFor(request);
    response.set("X-Request-Id", requestId);

    try {
      const route = normalizedRoute(request.path);
      if (request.method === "GET" && route === "/health") {
        jsonResponse(response, { ok: true }, 200, requestId);
        return;
      }
      if (request.method === "GET" && route === "/session") {
        await handleSession(request, response, requestId);
        return;
      }
      if (request.method === "GET" && route === "/") {
        await handleSnapshot(request, response, requestId);
        return;
      }
      if (request.method === "POST" && route === "/") {
        await handleMutation(request, response, requestId);
        return;
      }
      if (request.method === "POST" && route === "/menu-image") {
        await handleMenuImage(request, response, requestId);
        return;
      }
      jsonResponse(response, { message: "Not found." }, 404, requestId);
    } catch (error) {
      handleError(response, error, requestId);
    }
  },
);

async function handleSession(
  request: Request,
  response: HttpResponse,
  requestId: string,
) {
  try {
    const session = await requireAdmin(request, requestId);
    log("info", "session_check_succeeded", {
      requestId,
      role: session.role,
      uid: session.uid,
    });
    jsonResponse(response, { isAdmin: true, role: session.role }, 200, requestId);
  } catch (error) {
    if (
      error instanceof AdminAuthorizationError &&
      error.reason === "permission_denied"
    ) {
      log("info", "session_check_succeeded", {
        isAdmin: false,
        requestId,
      });
      jsonResponse(response, { isAdmin: false }, 200, requestId);
      return;
    }
    throw error;
  }
}

async function handleSnapshot(
  request: Request,
  response: HttpResponse,
  requestId: string,
) {
  const session = await requireAdmin(request, requestId);
  const snapshot = await loadAdminSnapshot(session);
  const customerEmails = await customerEmailMap(snapshot.customers.map((customer) => customer.id));
  snapshot.customers = snapshot.customers.map((customer) => ({
    ...customer,
    email: customerEmails.get(customer.id) ?? customer.email,
  }));
  snapshot.notificationEmailCount = snapshot.customers.filter((customer) => customer.email).length;
  log("info", "snapshot_loaded", { requestId, uid: session.uid });
  jsonResponse(response, snapshot, 200, requestId);
}

async function handleMutation(
  request: Request,
  response: HttpResponse,
  requestId: string,
) {
  const session = await requireAdmin(request, requestId);
  const body = adminMutationSchema.safeParse(request.body);
  if (!body.success) {
    jsonResponse(
      response,
      { message: "入力内容を確認してください。", issues: body.error.issues },
      400,
      requestId,
    );
    return;
  }
  if (body.data.action === "notification.send" && body.data.channel === "email") {
    await sendEmailNotification(body.data, session, requestId);
  } else {
    await applyAdminMutation(body.data, session);
  }
  log("info", "mutation_applied", {
    action: body.data.action,
    requestId,
    uid: session.uid,
  });
  jsonResponse(response, { ok: true }, 200, requestId);
}

async function sendEmailNotification(
  mutation: Extract<AdminMutation, { action: "notification.send" }>,
  session: AdminSession,
  requestId: string,
) {
  const database = adminFirestore();
  const customers = mutation.target === "all"
    ? (await database.collection("users").get()).docs.map((document) => ({
        id: stringValue(document.data().uid, document.id),
        name: customerName(document.data()),
      }))
    : await selectedCustomer(database, mutation.customerId);
  const emails = await customerEmailMap(customers.map((customer) => customer.id));
  const recipients = customers.flatMap((customer) => {
    const email = emails.get(customer.id);
    return email ? [{ email, name: customer.name }] : [];
  });
  if (recipients.length === 0) {
    throw new RequestError(
      mutation.target === "all"
        ? "メールアドレスが登録されているユーザーがいません。"
        : "選択したユーザーにはメールアドレスが登録されていません。",
      400,
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFICATION_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new Error("Email delivery is not configured.");
  }
  const person = mutation.target === "all" ? null : customers[0]?.name || "お客様";
  const history = database.collection("emailNotification").doc(requestId);
  await history.set({
    notificationId: history.id,
    person,
    title: mutation.title,
    content: mutation.content,
    targetType: mutation.target,
    targetCustomerId: mutation.target === "customer" ? mutation.customerId : null,
    recipientEmailCount: recipients.length,
    status: "queued",
    createdBy: session.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    for (let index = 0; index < recipients.length; index += 100) {
      const batch = recipients.slice(index, index + 100).map((recipient) => ({
        from,
        to: [recipient.email],
        subject: mutation.title,
        text: mutation.content,
        html: emailHtml(mutation.title, mutation.content, recipient.name),
      }));
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });
      if (!response.ok) {
        const details = await response.text();
        logger.error("[admin-api] email_delivery_failed", {
          requestId,
          status: response.status,
          details: details.slice(0, 500),
        });
        throw new Error(`Resend returned ${response.status}.`);
      }
    }
    await history.update({ status: "sent", sentAt: FieldValue.serverTimestamp() });
  } catch (error) {
    await history.update({
      status: "failed",
      failedAt: FieldValue.serverTimestamp(),
      errorCode: String(errorCode(error)),
    });
    throw error;
  }
}

async function selectedCustomer(database: Firestore, customerId: string) {
  const document = await database.collection("users").doc(customerId).get();
  if (!document.exists) {
    throw new RequestError("選択したユーザーが見つかりません。", 404);
  }
  return [{ id: customerId, name: customerName(document.data() ?? {}) }];
}

async function customerEmailMap(customerIds: string[]) {
  const result = new Map<string, string>();
  for (let index = 0; index < customerIds.length; index += 100) {
    const identifiers = customerIds.slice(index, index + 100).map((uid) => ({ uid }));
    if (identifiers.length === 0) continue;
    const users = await adminAuth().getUsers(identifiers);
    for (const user of users.users) {
      if (!user.disabled && user.email) result.set(user.uid, user.email);
    }
  }
  return result;
}

function customerName(data: DocumentData) {
  return `${stringValue(data.lastName)} ${stringValue(data.firstName)}`.trim()
    || stringValue(data.name, "お客様");
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function emailHtml(title: string, content: string, customer: string) {
  const paragraphs = escapeHtml(content).replace(/\n/g, "<br>");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#263023;line-height:1.8;max-width:640px;margin:auto"><p>${escapeHtml(customer)} 様</p><h1 style="font-size:20px">${escapeHtml(title)}</h1><p>${paragraphs}</p><hr style="border:0;border-top:1px solid #e4e9e1;margin:32px 0"><p style="color:#697365;font-size:12px">Salon Vishu</p></div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

async function handleMenuImage(
  request: Request,
  response: HttpResponse,
  requestId: string,
) {
  const session = await requireAdmin(request, requestId);
  const image = await readImage(request);
  const extension = imageTypes[image.contentType as keyof typeof imageTypes];
  if (!extension || !hasExpectedSignature(image.buffer, image.contentType)) {
    throw new RequestError("JPEG、PNG、WebP画像を選択してください。", 400);
  }

  const bucket = getStorage(getFirebaseAdminApp()).bucket();
  const imagePath = `menu-images/${crypto.randomUUID()}.${extension}`;
  const downloadToken = crypto.randomUUID();
  await bucket.file(imagePath).save(image.buffer, {
    resumable: false,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      contentType: image.contentType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        uploadedBy: session.uid,
      },
    },
  });

  const imageUrl =
    `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}` +
    `/o/${encodeURIComponent(imagePath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;
  log("info", "menu_image_uploaded", {
    imagePath,
    requestId,
    size: image.buffer.length,
    uid: session.uid,
  });
  jsonResponse(response, { imagePath, imageUrl }, 201, requestId);
}

async function requireAdmin(
  request: Request,
  requestId: string,
): Promise<AdminSession> {
  const authorization = request.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AdminAuthorizationError("ログインが必要です。", 401, "missing_token");
  }

  let token;
  try {
    token = await getAuth(getFirebaseAdminApp()).verifyIdToken(match[1], true);
  } catch (error) {
    log("warn", "token_verification_failed", {
      code: errorCode(error),
      requestId,
    });
    throw new AdminAuthorizationError(
      "ログインの有効期限が切れています。",
      401,
      "invalid_token",
    );
  }

  let role: AdminRole | null = null;
  let hasValidAdminDocument = false;
  try {
    const adminDocument = await adminFirestore()
      .collection("adminUsers")
      .doc(token.uid)
      .get();
    const data = adminDocument.data();
    hasValidAdminDocument =
      adminDocument.exists && isAdminDocumentForUid(data, token.uid);
    role = normalizeRole(data?.role);
  } catch (error) {
    log("warn", "admin_document_lookup_failed", {
      code: errorCode(error),
      requestId,
      uid: token.uid,
    });
  }

  if (!hasValidAdminDocument) {
    throw new AdminAuthorizationError(
      "管理者権限がありません。",
      403,
      "permission_denied",
    );
  }

  log("info", "permission_granted", {
    hasValidAdminDocument,
    requestId,
    uid: token.uid,
  });
  return {
    uid: token.uid,
    email: token.email ?? "",
    role: role ?? "owner",
  };
}

function readImage(request: Request) {
  return new Promise<{ buffer: Buffer; contentType: string }>((resolve, reject) => {
    const parser = Busboy({
      headers: request.headers,
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    });
    const chunks: Buffer[] = [];
    let contentType = "";
    let foundImage = false;
    let exceededLimit = false;

    parser.on("file", (fieldName, file, info) => {
      if (fieldName !== "image") {
        file.resume();
        return;
      }
      foundImage = true;
      contentType = info.mimeType;
      file.on("data", (chunk: Buffer) => chunks.push(chunk));
      file.on("limit", () => {
        exceededLimit = true;
      });
    });
    parser.on("error", reject);
    parser.on("finish", () => {
      if (exceededLimit) {
        reject(new RequestError("画像は5MB以下にしてください。", 400));
        return;
      }
      if (!foundImage || chunks.length === 0) {
        reject(new RequestError("画像ファイルを選択してください。", 400));
        return;
      }
      resolve({ buffer: Buffer.concat(chunks), contentType });
    });
    parser.end(request.rawBody);
  });
}

function hasExpectedSignature(buffer: Buffer, contentType: string) {
  if (contentType === "image/jpeg") {
    return buffer.length >= 3 &&
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (contentType === "image/png") {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.length >= signature.length &&
      buffer.subarray(0, signature.length).equals(signature);
  }
  return contentType === "image/webp" &&
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
}

function handleError(response: HttpResponse, error: unknown, requestId: string) {
  if (error instanceof AdminAuthorizationError || error instanceof RequestError) {
    log("warn", "request_rejected", {
      reason: error instanceof AdminAuthorizationError ? error.reason : "invalid_request",
      requestId,
      status: error.status,
    });
    jsonResponse(response, { message: error.message }, error.status, requestId);
    return;
  }
  log("error", "request_failed", {
    code: errorCode(error),
    message: error instanceof Error ? error.message : "unknown",
    requestId,
  });
  jsonResponse(
    response,
    { message: "管理データの処理に失敗しました。" },
    500,
    requestId,
  );
}

function jsonResponse(
  response: HttpResponse,
  body: Record<string, unknown>,
  status: number,
  requestId: string,
) {
  response.status(status).json({ ...body, requestId });
}

function requestIdFor(request: Request) {
  const requestId = request.get("x-request-id")?.trim();
  return requestId && /^[A-Za-z0-9._:-]{1,100}$/.test(requestId)
    ? requestId
    : crypto.randomUUID();
}

function normalizedRoute(path: string) {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

function normalizeRole(value: unknown): AdminRole | null {
  return value === "owner" || value === "manager" || value === "staff"
    ? value
    : null;
}

function errorCode(error: unknown) {
  return (error as { code?: unknown } | null)?.code ?? "unknown";
}

function log(
  level: "error" | "info" | "warn",
  event: string,
  details: Record<string, unknown>,
) {
  logger[level](`[admin-api] ${event}`, details);
}

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "RequestError";
  }
}

class AdminAuthorizationError extends RequestError {
  constructor(
    message: string,
    status: 401 | 403,
    readonly reason: "missing_token" | "invalid_token" | "permission_denied",
  ) {
    super(message, status);
    this.name = "AdminAuthorizationError";
  }
}

type HttpResponse = {
  set(field: string, value: string): HttpResponse;
  status(code: number): HttpResponse;
  json(body: unknown): HttpResponse;
};

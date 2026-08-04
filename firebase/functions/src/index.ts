import Busboy from "busboy";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { onRequest, type Request } from "firebase-functions/v2/https";
import {
  adminMutationSchema,
  applyAdminMutation,
  loadAdminSnapshot,
} from "../../../src/features/admin/server/admin-data";
import type {
  AdminRole,
  AdminSession,
} from "../../../src/features/admin/types";
import { adminFirestore, getFirebaseAdminApp } from "./firebase-admin-adapter";

const ADMIN_UIDS = new Set(["FQNtPf0iDcMpKh98F47Q4if0tXp1"]);
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
  await applyAdminMutation(body.data, session);
  log("info", "mutation_applied", {
    action: body.data.action,
    requestId,
    uid: session.uid,
  });
  jsonResponse(response, { ok: true }, 200, requestId);
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

  const roleFromClaim = normalizeRole(token.role);
  const hasAdminClaim = token.admin === true || roleFromClaim !== null;
  const configuredUids = (process.env.FIREBASE_ADMIN_UIDS ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
  const isAllowedUid = ADMIN_UIDS.has(token.uid) || configuredUids.includes(token.uid);

  let role = roleFromClaim;
  let active = false;
  try {
    const adminDocument = await adminFirestore()
      .collection("adminUsers")
      .doc(token.uid)
      .get();
    const data = adminDocument.data();
    active = adminDocument.exists && data?.active !== false;
    role ??= normalizeRole(data?.role);
  } catch (error) {
    log("warn", "admin_document_lookup_failed", {
      code: errorCode(error),
      requestId,
      uid: token.uid,
    });
  }

  if (!active && !hasAdminClaim && !isAllowedUid) {
    throw new AdminAuthorizationError(
      "管理者権限がありません。",
      403,
      "permission_denied",
    );
  }

  log("info", "permission_granted", {
    activeAdminDocument: active,
    hasAdminClaim,
    isAllowedUid,
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

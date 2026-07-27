import { AdminAuthorizationError, requireAdmin } from "@/features/admin/server/admin-auth";
import {
  adminMutationSchema,
  applyAdminMutation,
  loadAdminSnapshot,
} from "@/features/admin/server/admin-data";
import { adminLog } from "@/features/admin/server/admin-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  adminLog("info", "admin-route", "request_started", { method: "GET", requestId });
  try {
    const session = await requireAdmin(request, requestId);
    const snapshot = await loadAdminSnapshot(session);
    adminLog("info", "admin-route", "request_succeeded", {
      method: "GET",
      requestId,
      uid: session.uid,
    });
    return jsonResponse(snapshot, 200, requestId);
  } catch (error) {
    return errorResponse(error, requestId, "GET");
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFor(request);
  adminLog("info", "admin-route", "request_started", { method: "POST", requestId });
  try {
    const session = await requireAdmin(request, requestId);
    const body = adminMutationSchema.safeParse(await request.json());
    if (!body.success) {
      adminLog("warn", "admin-route", "validation_failed", {
        issueCount: body.error.issues.length,
        method: "POST",
        requestId,
        uid: session.uid,
      });
      return jsonResponse(
        { message: "入力内容を確認してください。", issues: body.error.issues },
        400,
        requestId,
      );
    }
    await applyAdminMutation(body.data, session);
    adminLog("info", "admin-route", "request_succeeded", {
      action: body.data.action,
      method: "POST",
      requestId,
      uid: session.uid,
    });
    return jsonResponse({ ok: true }, 200, requestId);
  } catch (error) {
    return errorResponse(error, requestId, "POST");
  }
}

function errorResponse(error: unknown, requestId: string, method: "GET" | "POST") {
  if (error instanceof AdminAuthorizationError) {
    adminLog("warn", "admin-route", "authorization_failed", {
      method,
      reason: error.reason,
      requestId,
      status: error.status,
    });
    return jsonResponse(
      { message: error.message },
      error.status,
      requestId,
    );
  }
  adminLog("error", "admin-route", "request_failed", {
    code: (error as { code?: unknown } | null)?.code ?? "unknown",
    errorName: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : "unknown",
    method,
    requestId,
  });
  return jsonResponse(
    { message: "管理データの処理に失敗しました。" },
    500,
    requestId,
  );
}

function requestIdFor(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();
  return requestId && /^[A-Za-z0-9._:-]{1,100}$/.test(requestId)
    ? requestId
    : crypto.randomUUID();
}

function jsonResponse(body: unknown, status: number, requestId: string) {
  return Response.json(
    { ...(body as Record<string, unknown>), requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/features/admin/server/admin-auth";
import { adminLog } from "@/features/admin/server/admin-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFor(request);
  adminLog("info", "admin-session", "check_started", { requestId });

  try {
    const session = await requireAdmin(request, requestId);
    adminLog("info", "admin-session", "check_succeeded", {
      requestId,
      role: session.role,
      uid: session.uid,
    });
    return jsonResponse(
      { isAdmin: true, role: session.role },
      200,
      requestId,
    );
  } catch (error) {
    if (
      error instanceof AdminAuthorizationError &&
      error.reason === "permission_denied"
    ) {
      adminLog("info", "admin-session", "check_succeeded", {
        isAdmin: false,
        requestId,
      });
      return jsonResponse({ isAdmin: false }, 200, requestId);
    }

    if (error instanceof AdminAuthorizationError) {
      adminLog("warn", "admin-session", "check_failed", {
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

    adminLog("error", "admin-session", "check_failed", {
      code: (error as { code?: unknown } | null)?.code ?? "unknown",
      errorName: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "unknown",
      requestId,
    });
    return jsonResponse(
      { message: "管理者権限を確認できませんでした。" },
      500,
      requestId,
    );
  }
}

function requestIdFor(request: Request) {
  const requestId = request.headers.get("x-request-id")?.trim();
  return requestId && /^[A-Za-z0-9._:-]{1,100}$/.test(requestId)
    ? requestId
    : crypto.randomUUID();
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  requestId: string,
) {
  return Response.json(
    { ...body, requestId },
    { status, headers: { "X-Request-Id": requestId } },
  );
}

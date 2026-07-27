import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { appAdminUids } from "@/features/admin/admin-access";
import { adminLog } from "@/features/admin/server/admin-log";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import type { AdminRole, AdminSession } from "@/features/admin/types";

export class AdminAuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
    readonly reason: "missing_token" | "invalid_token" | "permission_denied",
  ) {
    super(message);
    this.name = "AdminAuthorizationError";
  }
}

export async function requireAdmin(
  request: Request,
  requestId = request.headers.get("x-request-id") ?? "unknown",
): Promise<AdminSession> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    adminLog("warn", "admin-auth", "token_missing", { requestId });
    throw new AdminAuthorizationError("ログインが必要です。", 401, "missing_token");
  }

  let token: DecodedIdToken;
  try {
    token = await adminAuth().verifyIdToken(match[1], true);
  } catch (error) {
    adminLog("warn", "admin-auth", "token_verification_failed", {
      code: errorCode(error),
      errorName: error instanceof Error ? error.name : typeof error,
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
  const allowedUids = new Set(
    [
      ...appAdminUids,
      ...(process.env.FIREBASE_ADMIN_UIDS ?? "")
        .split(",")
        .map((uid) => uid.trim())
        .filter(Boolean),
    ],
  );

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
    adminLog("warn", "admin-auth", "admin_document_lookup_failed", {
      code: errorCode(error),
      errorName: error instanceof Error ? error.name : typeof error,
      requestId,
      uid: token.uid,
    });
    // The legacy production project does not have adminUsers yet. The explicit
    // UID allow-list and custom claims remain valid migration paths.
  }

  const isAllowedUid = allowedUids.has(token.uid);
  if (!active && !hasAdminClaim && !isAllowedUid) {
    adminLog("warn", "admin-auth", "permission_denied", {
      activeAdminDocument: active,
      hasAdminClaim,
      isAllowedUid,
      requestId,
      uid: token.uid,
    });
    throw new AdminAuthorizationError(
      "管理者権限がありません。",
      403,
      "permission_denied",
    );
  }

  adminLog("info", "admin-auth", "permission_granted", {
    activeAdminDocument: active,
    hasAdminClaim,
    isAllowedUid,
    requestId,
    role: role ?? "owner",
    uid: token.uid,
  });

  return {
    uid: token.uid,
    email: token.email ?? "",
    role: role ?? "owner",
  };
}

function errorCode(error: unknown) {
  return (error as { code?: unknown } | null)?.code ?? "unknown";
}

function normalizeRole(value: unknown): AdminRole | null {
  return value === "owner" || value === "manager" || value === "staff"
    ? value
    : null;
}

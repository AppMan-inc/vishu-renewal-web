import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { appAdminUids } from "@/features/admin/admin-access";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import type { AdminRole, AdminSession } from "@/features/admin/types";

export class AdminAuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}

export async function requireAdmin(request: Request): Promise<AdminSession> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AdminAuthorizationError("ログインが必要です。", 401);
  }

  let token: DecodedIdToken;
  try {
    token = await adminAuth().verifyIdToken(match[1], true);
  } catch {
    throw new AdminAuthorizationError("ログインの有効期限が切れています。", 401);
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
  } catch {
    // The legacy production project does not have adminUsers yet. The explicit
    // UID allow-list and custom claims remain valid migration paths.
  }

  if (!active && !hasAdminClaim && !allowedUids.has(token.uid)) {
    throw new AdminAuthorizationError("管理者権限がありません。", 403);
  }

  return {
    uid: token.uid,
    email: token.email ?? "",
    role: role ?? "owner",
  };
}

function normalizeRole(value: unknown): AdminRole | null {
  return value === "owner" || value === "manager" || value === "staff"
    ? value
    : null;
}

"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import type { User } from "firebase/auth";
import type { AdminSnapshot } from "@/features/admin/types";

type AdminAccessResult = {
  isAdmin: boolean;
  requestId?: string;
};

export async function checkAdminAccess(user: User): Promise<AdminAccessResult> {
  const requestId = crypto.randomUUID();
  console.info("[admin-access] check_started", {
    requestId,
    uid: user.uid,
  });

  let token: string;
  try {
    token = await user.getIdToken();
  } catch (error) {
    console.error("[admin-access] token_fetch_failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      requestId,
      uid: user.uid,
    });
    throw new AdminApiError(
      "ログイン情報を確認できませんでした。再度ログインしてください。",
      401,
      requestId,
    );
  }

  let response: Response;
  try {
    response = await fetch("/api/admin/session", {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Request-Id": requestId,
      },
    });
  } catch (error) {
    console.error("[admin-access] check_failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      requestId,
      uid: user.uid,
    });
    throw new AdminApiError(
      "管理者権限を確認するサーバーへ接続できませんでした。",
      0,
      requestId,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    isAdmin?: boolean;
    message?: string;
    requestId?: string;
  };
  const responseRequestId = payload.requestId ?? requestId;

  if (!response.ok || typeof payload.isAdmin !== "boolean") {
    console.warn("[admin-access] check_rejected", {
      message: payload.message,
      requestId: responseRequestId,
      status: response.status,
      uid: user.uid,
    });
    throw new AdminApiError(
      payload.message ?? "管理者権限を確認できませんでした。",
      response.status,
      responseRequestId,
    );
  }

  console.info("[admin-access] check_succeeded", {
    isAdmin: payload.isAdmin,
    requestId: responseRequestId,
    uid: user.uid,
  });
  return { isAdmin: payload.isAdmin, requestId: responseRequestId };
}

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>("GET");
}

export async function mutateAdmin(body: Record<string, unknown>) {
  await adminRequest<{ ok: true }>("POST", body);
}

async function adminRequest<T>(method: "GET" | "POST", body?: Record<string, unknown>) {
  const requestId = crypto.randomUUID();
  const user = firebaseAuth().currentUser;

  if (!user) {
    console.warn("[admin-api] session_missing", { method, requestId });
    throw new AdminApiError("ログインが必要です。", 401, requestId);
  }

  console.info("[admin-api] request_started", {
    method,
    requestId,
    uid: user.uid,
  });

  let token: string;
  try {
    token = await user.getIdToken();
  } catch (error) {
    console.error("[admin-api] token_fetch_failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      method,
      requestId,
      uid: user.uid,
    });
    throw new AdminApiError(
      "ログイン情報を取得できませんでした。再度ログインしてください。",
      401,
      requestId,
    );
  }

  let response: Response;
  try {
    response = await fetch("/api/admin", {
      method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Request-Id": requestId,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.error("[admin-api] request_failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      method,
      requestId,
      uid: user.uid,
    });
    throw new AdminApiError(
      "管理画面のサーバーへ接続できませんでした。",
      0,
      requestId,
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    requestId?: string;
  } & T;

  const responseRequestId = payload.requestId ?? requestId;
  if (!response.ok) {
    console.warn("[admin-api] request_rejected", {
      message: payload.message,
      method,
      requestId: responseRequestId,
      status: response.status,
      uid: user.uid,
    });
    throw new AdminApiError(
      payload.message ?? "管理データの処理に失敗しました。",
      response.status,
      responseRequestId,
    );
  }

  console.info("[admin-api] request_succeeded", {
    method,
    requestId: responseRequestId,
    status: response.status,
    uid: user.uid,
  });
  return payload;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

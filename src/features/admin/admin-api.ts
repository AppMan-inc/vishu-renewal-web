"use client";

import { firebaseAuth } from "@/lib/firebase/client";
import type { AdminSnapshot } from "@/features/admin/types";

export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  return adminRequest<AdminSnapshot>("GET");
}

export async function mutateAdmin(body: Record<string, unknown>) {
  await adminRequest<{ ok: true }>("POST", body);
}

async function adminRequest<T>(method: "GET" | "POST", body?: Record<string, unknown>) {
  const user = firebaseAuth().currentUser;
  if (!user) throw new AdminApiError("ログインが必要です。", 401);
  const token = await user.getIdToken();
  const response = await fetch("/api/admin", {
    method,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;
  if (!response.ok) {
    throw new AdminApiError(payload.message ?? "管理データの処理に失敗しました。", response.status);
  }
  return payload;
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

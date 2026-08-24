"use client";

import { FirebaseError } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import type { SelectableClosurePeriod } from "@/features/admin/closure-registration";

const functionsRegion = "asia-northeast2";

export type CreateAdminClosuresRequest = {
  startDate: string;
  endDate: string;
  period: SelectableClosurePeriod;
  requestId: string;
};

export type CreateAdminClosuresResult = {
  closureGroupId: string;
  createdIds: string[];
  createdDates: string[];
  skippedClosedDates: string[];
};

export type DeleteAdminClosuresRequest = {
  closureIds: string[];
  closureGroupId?: string;
  requestId: string;
};

export type ClosureConflict = {
  businessDate: string;
  startAt: string;
  endAt: string;
  type: "reservation" | "closure";
  customerName?: string;
};

export class AdminClosureApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly conflicts: ClosureConflict[] = [],
  ) {
    super(message);
    this.name = "AdminClosureApiError";
  }
}

export async function createAdminClosures(
  request: CreateAdminClosuresRequest,
) {
  try {
    const callable = httpsCallable<
      CreateAdminClosuresRequest,
      CreateAdminClosuresResult
    >(firebaseFunctions(), "createAdminClosures");
    return (await callable(request)).data;
  } catch (error) {
    throw normalizeClosureError(error);
  }
}

export async function deleteAdminClosures(
  request: DeleteAdminClosuresRequest,
) {
  try {
    const callable = httpsCallable<
      DeleteAdminClosuresRequest,
      { deletedIds: string[] }
    >(firebaseFunctions(), "deleteAdminClosures");
    return (await callable(request)).data;
  } catch (error) {
    throw normalizeClosureError(error);
  }
}

function firebaseFunctions() {
  return getFunctions(getFirebaseApp(), functionsRegion);
}

function normalizeClosureError(error: unknown) {
  const code = error instanceof FirebaseError
    ? error.code.replace(/^functions\//, "")
    : "unknown";
  const errorRecord = objectValue(error);
  const customData = objectValue(error instanceof FirebaseError ? error.customData : null);
  const details = objectValue(errorRecord.details ?? customData.details ?? customData);
  const conflicts = conflictList(details.conflicts);

  if (code === "unauthenticated" || code === "permission-denied") {
    return new AdminClosureApiError("管理者として再ログインしてください。", code);
  }
  if (code === "failed-precondition" || code === "invalid-argument") {
    const serverMessage = error instanceof Error ? cleanFunctionsMessage(error.message) : "";
    return new AdminClosureApiError(
      serverMessage || "休業の登録内容を確認してください。",
      code,
      conflicts,
    );
  }
  return new AdminClosureApiError(
    "通信に失敗しました。入力内容を保持したまま再試行できます。",
    code,
  );
}

function conflictList(value: unknown): ClosureConflict[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const record = objectValue(item);
    if (
      typeof record.businessDate !== "string" ||
      typeof record.startAt !== "string" ||
      typeof record.endAt !== "string" ||
      (record.type !== "reservation" && record.type !== "closure")
    ) {
      return [];
    }
    return [{
      businessDate: record.businessDate,
      startAt: record.startAt,
      endAt: record.endAt,
      type: record.type,
      ...(typeof record.customerName === "string"
        ? { customerName: record.customerName }
        : {}),
    }];
  });
}

function cleanFunctionsMessage(message: string) {
  return message.replace(/^FirebaseError:\s*/i, "").trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

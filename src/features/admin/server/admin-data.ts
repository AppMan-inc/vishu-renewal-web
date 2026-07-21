import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminFirestore } from "@/lib/firebase/admin";
import type {
  AdminCustomer,
  AdminMenu,
  AdminReservation,
  AdminRestBlock,
  AdminSession,
  AdminSnapshot,
  KarteEntry,
  ReservationStatus,
} from "@/features/admin/types";

const reservationStatusSchema = z.enum(["confirmed", "visited", "canceled"]);

export const adminMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reservation.status"),
    sourcePath: z.string().min(1),
    status: reservationStatusSchema,
  }),
  z.object({
    action: z.literal("rest.create"),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
  }),
  z.object({ action: z.literal("rest.delete"), id: z.string().min(1) }),
  z.object({
    action: z.literal("menu.save"),
    menu: z.object({
      id: z.string(),
      treatmentDetail: z.string().trim().min(1).max(120),
      menuIntroduction: z.string().trim().max(1000),
      treatmentDetailList: z.array(z.string().trim().min(1).max(120)).max(20),
      treatmentTimeMinutes: z.number().int().min(1).max(720),
      beforePrice: z.number().int().min(0).max(10_000_000),
      afterPrice: z.number().int().min(0).max(10_000_000),
      isCallable: z.boolean(),
      isNeedExtraMoney: z.boolean(),
      priority: z.number().int().min(0).max(9999),
    }),
  }),
  z.object({ action: z.literal("menu.delete"), id: z.string().min(1) }),
  z.object({
    action: z.literal("karte.note"),
    customerId: z.string().min(1),
    note: z.string().trim().max(4000),
  }),
  z.object({
    action: z.literal("karte.save"),
    entry: z.object({
      id: z.string(),
      customerId: z.string().min(1),
      reservationId: z.string().nullable(),
      treatmentAt: z.iso.datetime(),
      menuName: z.string().trim().max(120),
      treatmentNote: z.string().trim().min(1).max(8000),
      colorFormulaNote: z.string().trim().max(4000),
      nextVisitNote: z.string().trim().max(4000),
    }),
  }),
]);

export type AdminMutation = z.infer<typeof adminMutationSchema>;

export async function loadAdminSnapshot(
  session: AdminSession,
): Promise<AdminSnapshot> {
  const database = adminFirestore();
  const [menus, legacyReservations, renewalReservations, rests, users, notes, entries] =
    await Promise.all([
      database.collection("menu").get(),
      database.collectionGroup("reservations").get(),
      database.collection("reservation").get(),
      database.collection("rests").get(),
      database.collection("users").get(),
      database.collectionGroup("karteProfile").get(),
      database.collectionGroup("karteEntries").get(),
    ]);

  const sharedNotes = new Map<string, string>();
  for (const document of notes.docs) {
    const customerId = document.ref.parent.parent?.id;
    if (customerId) sharedNotes.set(customerId, stringValue(document.data().sharedNote));
  }

  const reservationsById = new Map<string, AdminReservation>();
  for (const document of legacyReservations.docs) {
    const reservation = reservationFromDocument(
      document.id,
      document.ref.path,
      document.data(),
      document.ref.parent.parent?.id ?? "",
    );
    if (reservation) reservationsById.set(reservation.id, reservation);
  }
  for (const document of renewalReservations.docs) {
    const reservation = reservationFromDocument(
      document.id,
      document.ref.path,
      document.data(),
      "",
    );
    if (reservation) reservationsById.set(reservation.id, reservation);
  }

  return {
    session,
    menus: menus.docs.map((document) => menuFromDocument(document.id, document.data()))
      .sort((a, b) => a.priority - b.priority || a.afterPrice - b.afterPrice),
    reservations: [...reservationsById.values()].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    ),
    restBlocks: rests.docs
      .map((document) => restFromDocument(document.id, document.data()))
      .filter((item): item is AdminRestBlock => item !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    customers: users.docs
      .map((document) => customerFromDocument(document.id, document.data(), sharedNotes))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja")),
    karteEntries: entries.docs
      .map((document) => karteFromDocument(document.id, document.data(), document.ref.parent.parent?.id ?? ""))
      .filter((item): item is KarteEntry => item !== null)
      .sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt)),
    fetchedAt: new Date().toISOString(),
  };
}

export async function applyAdminMutation(
  mutation: AdminMutation,
  session: AdminSession,
) {
  const database = adminFirestore();
  switch (mutation.action) {
    case "reservation.status": {
      if (!isReservationPath(mutation.sourcePath)) {
        throw new Error("更新対象の予約パスが不正です。");
      }
      await database.doc(mutation.sourcePath).update({
        status: mutation.status,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }
    case "rest.create": {
      const start = new Date(mutation.startTime);
      const end = new Date(mutation.endTime);
      if (!(start < end)) throw new Error("終了時刻は開始時刻より後にしてください。");
      await ensureRestDoesNotOverlap(start, end);
      const reference = database.collection("rests").doc();
      await reference.set({
        restId: reference.id,
        startTime: Timestamp.fromDate(start),
        endTime: Timestamp.fromDate(end),
        createdBy: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }
    case "rest.delete":
      await database.collection("rests").doc(mutation.id).delete();
      return;
    case "menu.save": {
      const collection = database.collection("menu");
      const reference = mutation.menu.id ? collection.doc(mutation.menu.id) : collection.doc();
      await reference.set(
        {
          menuId: reference.id,
          treatmentDetail: mutation.menu.treatmentDetail,
          treatmentDetailList: mutation.menu.treatmentDetailList,
          menuIntroduction: mutation.menu.menuIntroduction,
          beforePrice: mutation.menu.beforePrice || null,
          afterPrice: mutation.menu.afterPrice,
          treatmentTime: mutation.menu.treatmentTimeMinutes,
          isCallable: mutation.menu.isCallable,
          isNeedExtraMoney: mutation.menu.isNeedExtraMoney,
          priority: mutation.menu.priority,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }
    case "menu.delete":
      await database.collection("menu").doc(mutation.id).delete();
      return;
    case "karte.note":
      await database
        .collection("users")
        .doc(mutation.customerId)
        .collection("karteProfile")
        .doc("current")
        .set(
          {
            customerId: mutation.customerId,
            sharedNote: mutation.note,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      return;
    case "karte.save": {
      const collection = database
        .collection("users")
        .doc(mutation.entry.customerId)
        .collection("karteEntries");
      const reference = mutation.entry.id ? collection.doc(mutation.entry.id) : collection.doc();
      const existing = mutation.entry.id ? await reference.get() : null;
      await reference.set(
        {
          customerId: mutation.entry.customerId,
          reservationId: mutation.entry.reservationId,
          treatmentAt: Timestamp.fromDate(new Date(mutation.entry.treatmentAt)),
          menuName: mutation.entry.menuName,
          treatmentNote: mutation.entry.treatmentNote,
          colorFormulaNote: mutation.entry.colorFormulaNote,
          nextVisitNote: mutation.entry.nextVisitNote,
          createdAt: existing?.data()?.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }
  }
}

async function ensureRestDoesNotOverlap(start: Date, end: Date) {
  const database = adminFirestore();
  const [rests, legacyReservations, renewalReservations] = await Promise.all([
    database.collection("rests").get(),
    database.collectionGroup("reservations").get(),
    database.collection("reservation").get(),
  ]);
  const blocked = [
    ...rests.docs.map((document) => ({
      start: dateValue(document.data().startTime),
      end: dateValue(document.data().endTime),
      canceled: false,
    })),
    ...[...legacyReservations.docs, ...renewalReservations.docs].map((document) => ({
      start: dateValue(document.data().startAt ?? document.data().startTime),
      end: dateValue(document.data().endAt ?? document.data().finishTime),
      canceled: normalizeStatus(document.data().status) === "canceled",
    })),
  ];
  if (
    blocked.some(
      (item) =>
        !item.canceled && item.start && item.end && start < item.end && item.start < end,
    )
  ) {
    throw new Error("既存の予約または休憩と重複しています。");
  }
}

function menuFromDocument(id: string, data: Record<string, unknown>): AdminMenu {
  return {
    id,
    treatmentDetail: stringValue(data.treatmentDetail, "名称未設定"),
    menuIntroduction: stringValue(data.menuIntroduction),
    treatmentDetailList: stringArray(data.treatmentDetailList),
    treatmentTimeMinutes: numberValue(data.treatmentTime, 60),
    beforePrice: numberValue(data.beforePrice),
    afterPrice: numberValue(data.afterPrice),
    isCallable: data.isCallable === true,
    isNeedExtraMoney: data.isNeedExtraMoney === true,
    priority: numberValue(data.priority, 999),
    updatedAt: dateValue(data.updatedAt)?.toISOString() ?? null,
  };
}

function reservationFromDocument(
  documentId: string,
  sourcePath: string,
  data: Record<string, unknown>,
  fallbackCustomerId: string,
): AdminReservation | null {
  const start = dateValue(data.startAt ?? data.startTime);
  const end = dateValue(data.endAt ?? data.finishTime);
  if (!start || !end) return null;
  return {
    id: stringValue(data.reservationId, documentId),
    sourcePath,
    customerId: stringValue(data.uid, fallbackCustomerId),
    customerName: stringValue(data.customerName ?? data.name, "お客様"),
    telephoneNumber: stringValue(data.telephoneNumber),
    menuId: stringValue(data.menuId),
    treatmentDetail: stringValue(data.menuName ?? data.treatmentDetail, "ご予約メニュー"),
    treatmentTimeMinutes: numberValue(
      data.durationMinutes ?? data.treatmentTime,
      Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000)),
    ),
    price: numberValue(data.price ?? data.afterPrice ?? data.beforePrice),
    startTime: start.toISOString(),
    finishTime: end.toISOString(),
    customerHope: stringValue(data.request ?? data.customerHope),
    status: normalizeStatus(data.status),
    createdAt: (dateValue(data.createdAt) ?? start).toISOString(),
  };
}

function restFromDocument(id: string, data: Record<string, unknown>): AdminRestBlock | null {
  const start = dateValue(data.startTime);
  const end = dateValue(data.endTime);
  if (!start || !end) return null;
  return {
    id: stringValue(data.restId, id),
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    createdAt: (dateValue(data.createdAt) ?? start).toISOString(),
  };
}

function customerFromDocument(
  id: string,
  data: Record<string, unknown>,
  notes: Map<string, string>,
): AdminCustomer {
  const customerId = stringValue(data.uid, id);
  const splitName = `${stringValue(data.lastName)} ${stringValue(data.firstName)}`.trim();
  return {
    id: customerId,
    displayName: splitName || stringValue(data.name, "お客様"),
    telephoneNumber: stringValue(data.telephoneNumber),
    dateOfBirth: displayDateValue(data.dateOfBirth),
    gender: stringValue(data.gender),
    sharedNote: notes.get(customerId) ?? "",
  };
}

function karteFromDocument(
  id: string,
  data: Record<string, unknown>,
  fallbackCustomerId: string,
): KarteEntry | null {
  const treatmentAt = dateValue(data.treatmentAt);
  if (!treatmentAt) return null;
  const createdAt = dateValue(data.createdAt) ?? treatmentAt;
  return {
    id,
    customerId: stringValue(data.customerId, fallbackCustomerId),
    reservationId: stringValue(data.reservationId) || null,
    treatmentAt: treatmentAt.toISOString(),
    menuName: stringValue(data.menuName),
    treatmentNote: stringValue(data.treatmentNote),
    colorFormulaNote: stringValue(data.colorFormulaNote),
    nextVisitNote: stringValue(data.nextVisitNote),
    createdAt: createdAt.toISOString(),
    updatedAt: (dateValue(data.updatedAt) ?? createdAt).toISOString(),
  };
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") return toDate.call(value) as Date;
  }
  return null;
}

function displayDateValue(value: unknown) {
  return dateValue(value)?.toISOString().slice(0, 10) ?? stringValue(value);
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => stringValue(item)).filter(Boolean)
    : [];
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9-]/g, ""));
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return fallback;
}

function normalizeStatus(value: unknown): ReservationStatus {
  const status = stringValue(value).toLowerCase();
  if (status === "visited" || status === "来店済み" || status === "completed") return "visited";
  if (status === "canceled" || status === "cancelled" || status === "キャンセル") return "canceled";
  return "confirmed";
}

function isReservationPath(path: string) {
  return /^reservation\/[^/]+$/.test(path) || /^users\/[^/]+\/reservations\/[^/]+$/.test(path);
}

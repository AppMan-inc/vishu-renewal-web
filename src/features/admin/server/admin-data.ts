import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminFirestore } from "@/lib/firebase/admin";
import { adminLog } from "@/features/admin/server/admin-log";
import { attachPreviousVisits } from "@/features/admin/reservation-history";
import type {
  AdminCustomer,
  AdminBookingSettings,
  AdminEmailNotification,
  AdminMenu,
  AdminPushNotification,
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
    action: z.literal("rest.apply"),
    blocks: z.array(z.object({
      startTime: z.iso.datetime(),
      endTime: z.iso.datetime(),
    })).max(200),
    deleteIds: z.array(z.string().min(1).max(256)).max(200),
  }).refine(
    (value) => value.blocks.length > 0 || value.deleteIds.length > 0,
    { message: "変更する休憩時間を選択してください。" },
  ),
  z.object({
    action: z.literal("menu.save"),
    menu: z.object({
      id: z.string(),
      treatmentDetail: z.string().trim().min(1).max(120),
      menuIntroduction: z.string().trim().max(1000),
      treatmentDetailList: z.array(z.string().trim().min(1).max(120)).max(20),
      menuImageUrl: z.string().trim().max(2048).refine(
        (value) => !value || isCloudStorageImageUrl(value),
        { message: "メニュー画像のURLが不正です。" },
      ),
      menuImagePath: z.string().trim().max(512),
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
    action: z.literal("notification.send"),
    channel: z.enum(["push", "email"]),
    target: z.enum(["all", "customer"]),
    customerId: z.string().trim().max(128),
    title: z.string().trim().min(1).max(100),
    content: z.string().trim().min(1).max(1000),
  }).refine(
    (value) => value.target === "all" || value.customerId.length > 0,
    { message: "通知先のユーザーを選択してください。", path: ["customerId"] },
  ),
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
  const [menus, legacyReservations, renewalReservations, rests, users, notes, entries, currentDeviceTokens, legacyDeviceTokens, pushNotifications, emailNotifications, bookingSettings] =
    await Promise.all([
      database.collection("menu").get(),
      database.collectionGroup("reservations").get(),
      database.collection("reservation").get(),
      database.collection("rests").get(),
      database.collection("users").get(),
      database.collectionGroup("karteProfile").get(),
      database.collectionGroup("karteEntries").get(),
      database.collectionGroup("deviceTokens").get(),
      database.collectionGroup("deviceTokenId").get(),
      database.collection("pushNotification").get(),
      database.collection("emailNotification").get(),
      database.collection("settings").doc("businessHours").get(),
    ]);

  const pushTokenCounts = new Map<string, Set<string>>();
  const notificationDeviceTokens = new Set<string>();
  for (const document of [...currentDeviceTokens.docs, ...legacyDeviceTokens.docs]) {
    const customerId = document.ref.parent.parent?.id;
    const token = stringValue(document.data().token ?? document.data().deviceId);
    if (!customerId || !token) continue;
    notificationDeviceTokens.add(token);
    const tokens = pushTokenCounts.get(customerId) ?? new Set<string>();
    tokens.add(token);
    pushTokenCounts.set(customerId, tokens);
  }

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
  const reservations = attachPreviousVisits(
    [...reservationsById.values()].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    ),
  );

  return {
    session,
    menus: menus.docs.map((document) => menuFromDocument(document.id, document.data()))
      .sort((a, b) => {
        const priorityComparison = a.priority - b.priority;
        if (priorityComparison !== 0) return priorityComparison;
        const aPrice = a.afterPrice > 0 ? a.afterPrice : Number.POSITIVE_INFINITY;
        const bPrice = b.afterPrice > 0 ? b.afterPrice : Number.POSITIVE_INFINITY;
        if (aPrice === bPrice) return 0;
        return aPrice - bPrice;
      }),
    reservations,
    restBlocks: rests.docs
      .map((document) => restFromDocument(document.id, document.data()))
      .filter((item): item is AdminRestBlock => item !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    bookingSettings: bookingSettingsFromDocument(bookingSettings.data()),
    customers: users.docs
      .map((document) => customerFromDocument(
        document.id,
        document.data(),
        sharedNotes,
        pushTokenCounts.get(stringValue(document.data().uid, document.id))?.size ?? 0,
      ))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ja")),
    karteEntries: entries.docs
      .map((document) => karteFromDocument(document.id, document.data(), document.ref.parent.parent?.id ?? ""))
      .filter((item): item is KarteEntry => item !== null)
      .sort((a, b) => b.treatmentAt.localeCompare(a.treatmentAt)),
    pushNotifications: pushNotifications.docs
      .map((document) => pushNotificationFromDocument(
        document.id,
        document.data(),
        document.createTime.toDate(),
      ))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 30),
    emailNotifications: emailNotifications.docs
      .map((document) => emailNotificationFromDocument(
        document.id,
        document.data(),
        document.createTime.toDate(),
      ))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 30),
    notificationDeviceCount: notificationDeviceTokens.size,
    notificationEmailCount: users.docs.filter((document) => stringValue(document.data().email)).length,
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
    case "rest.apply":
      await applyRestChanges(
        mutation.blocks.map((block) => ({
          start: new Date(block.startTime),
          end: new Date(block.endTime),
        })),
        new Set(mutation.deleteIds),
        session.uid,
      );
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
          menuImageUrl: mutation.menu.menuImageUrl || null,
          menuImagePath: mutation.menu.menuImagePath || null,
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
    case "notification.send": {
      if (mutation.channel !== "push") {
        throw new Error("メール送信は管理APIから実行してください。");
      }
      adminLog("info", "admin-notification", "target_resolution_started", {
        stage: "target_resolution.started",
        target: mutation.target,
        requestedBy: session.uid,
      });
      const targetTokenSnapshots = mutation.target === "all"
        ? await Promise.all([
            database.collectionGroup("deviceTokens").get(),
            database.collectionGroup("deviceTokenId").get(),
          ])
        : await Promise.all([
            database
              .collection("users")
              .doc(mutation.customerId)
              .collection("deviceTokens")
              .get(),
            database
              .collection("users")
              .doc(mutation.customerId)
              .collection("deviceTokenId")
              .get(),
          ]);
      const deviceIdList = [...new Set(
        targetTokenSnapshots
          .flatMap((snapshot) => snapshot.docs)
          .map((document) => stringValue(document.data().token ?? document.data().deviceId))
          .filter(Boolean),
      )];
      adminLog("info", "admin-notification", "target_resolution_completed", {
        stage: "target_resolution.completed",
        target: mutation.target,
        currentDocumentCount: targetTokenSnapshots[0].size,
        legacyDocumentCount: targetTokenSnapshots[1].size,
        recipientDeviceCount: deviceIdList.length,
        requestedBy: session.uid,
      });
      if (deviceIdList.length === 0) {
        adminLog("warn", "admin-notification", "target_resolution_empty", {
          stage: "target_resolution.empty",
          target: mutation.target,
          requestedBy: session.uid,
        });
        throw new Error(
          mutation.target === "all"
            ? "通知を受け取れる登録端末がありません。"
            : "選択したユーザーには通知を受け取れる端末がありません。",
        );
      }

      let person: string | null = null;
      if (mutation.target === "customer") {
        const customer = await database.collection("users").doc(mutation.customerId).get();
        if (!customer.exists) throw new Error("選択したユーザーが見つかりません。");
        const customerData = customer.data() ?? {};
        person = `${stringValue(customerData.lastName)} ${stringValue(customerData.firstName)}`.trim()
          || stringValue(customerData.name, "お客様");
      }

      const reference = database.collection("pushNotification").doc();
      await reference.set({
        notificationId: reference.id,
        person,
        title: mutation.title,
        content: mutation.content,
        deviceIdList,
        targetType: mutation.target,
        targetCustomerId: mutation.target === "customer" ? mutation.customerId : null,
        recipientDeviceCount: deviceIdList.length,
        createdBy: session.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      adminLog("info", "admin-notification", "notification_document_created", {
        stage: "notification_document.created",
        notificationId: reference.id,
        target: mutation.target,
        recipientDeviceCount: deviceIdList.length,
        requestedBy: session.uid,
      });
      return;
    }
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

type RestChangeRange = { start: Date; end: Date };

async function applyRestChanges(
  blocks: RestChangeRange[],
  deleteIds: Set<string>,
  uid: string,
) {
  validateRestChangeRanges(blocks);
  const database = adminFirestore();
  await database.runTransaction(async (transaction) => {
    const settingsReference = database.collection("settings").doc("businessHours");
    const [settingsDocument, rests, legacyReservations, renewalReservations] =
      await Promise.all([
        transaction.get(settingsReference),
        transaction.get(database.collection("rests")),
        transaction.get(database.collectionGroup("reservations")),
        transaction.get(database.collection("reservation")),
      ]);
    const settings = bookingSettingsFromDocument(settingsDocument.data());
    for (const block of blocks) validateRestBusinessHours(block, settings);

    const existingRanges = rests.docs
      .filter((document) => !deleteIds.has(document.id))
      .map((document) => ({
        start: dateValue(document.data().startTime),
        end: dateValue(document.data().endTime),
      }));
    const reservationRanges = [...legacyReservations.docs, ...renewalReservations.docs]
      .filter((document) => normalizeStatus(document.data().status) !== "canceled")
      .map((document) => ({
        start: dateValue(document.data().startAt ?? document.data().startTime),
        end: dateValue(document.data().endAt ?? document.data().finishTime),
      }));
    const conflicts = [...existingRanges, ...reservationRanges];
    if (blocks.some((block) => conflicts.some((item) =>
      item.start && item.end && rangesOverlap(block, {
        start: item.start,
        end: item.end,
      })))) {
      throw new Error("予約または登録済みの休憩と重複しています。");
    }

    for (const id of deleteIds) {
      transaction.delete(database.collection("rests").doc(id));
    }
    for (const block of blocks) {
      const reference = database.collection("rests").doc();
      transaction.set(reference, {
        restId: reference.id,
        startTime: Timestamp.fromDate(block.start),
        endTime: Timestamp.fromDate(block.end),
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  });
}

function validateRestChangeRanges(blocks: RestChangeRange[]) {
  const now = new Date();
  const latest = new Date(now.getTime() + 90 * 24 * 60 * 60_000);
  const sorted = [...blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const block of sorted) {
    if (!(block.start < block.end)) {
      throw new Error("終了時刻は開始時刻より後にしてください。");
    }
    if (block.start < now || block.start > latest) {
      throw new Error("休憩は現在から90日以内で選択してください。");
    }
    if (
      block.start.getUTCSeconds() !== 0 || block.start.getUTCMilliseconds() !== 0 ||
      block.end.getUTCSeconds() !== 0 || block.end.getUTCMilliseconds() !== 0
    ) {
      throw new Error("休憩時間を予約枠の境界に合わせてください。");
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    if (rangesOverlap(sorted[index - 1], sorted[index])) {
      throw new Error("選択した休憩時間が重複しています。");
    }
  }
}

function validateRestBusinessHours(
  block: RestChangeRange,
  settings: AdminBookingSettings,
) {
  const start = tokyoDateParts(block.start);
  const end = tokyoDateParts(block.end);
  const sameDay = start.year === end.year && start.month === end.month &&
    start.day === end.day;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  if (
    !sameDay ||
    settings.closedWeekdays.includes(start.weekday) ||
    startMinutes < settings.openingMinutes ||
    endMinutes > settings.closingMinutes ||
    (startMinutes - settings.openingMinutes) % settings.slotIntervalMinutes !== 0 ||
    (endMinutes - settings.openingMinutes) % settings.slotIntervalMinutes !== 0
  ) {
    throw new Error("営業時間内の予約枠を選択してください。");
  }
}

function rangesOverlap(a: RestChangeRange, b: RestChangeRange) {
  return a.start < b.end && b.start < a.end;
}

function tokyoDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const year = value("year");
  const month = value("month");
  const day = value("day");
  const jsWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    hour: value("hour"),
    minute: value("minute"),
    weekday: jsWeekday === 0 ? 7 : jsWeekday,
  };
}

function bookingSettingsFromDocument(
  data: Record<string, unknown> | undefined,
): AdminBookingSettings {
  const openingMinutes = minutesFromDayTime(data?.openingTime) ?? 9 * 60;
  const closingMinutes = minutesFromDayTime(data?.closingTime) ?? 18 * 60;
  const interval = numberValue(data?.slotIntervalMinutes, 30);
  return {
    openingMinutes,
    closingMinutes: closingMinutes > openingMinutes ? closingMinutes : 18 * 60,
    slotIntervalMinutes: interval > 0 ? interval : 30,
    closedWeekdays: Array.isArray(data?.closedWeekdays)
      ? data.closedWeekdays.map((value) => numberValue(value)).filter((value) =>
        value >= 1 && value <= 7)
      : [],
  };
}

function minutesFromDayTime(value: unknown) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const hour = numberValue(record.hour, -1);
    const minute = numberValue(record.minute);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
  }
  if (typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value)) {
    const [hour, minute] = value.split(":").map(Number);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
  }
  return null;
}

function menuFromDocument(id: string, data: Record<string, unknown>): AdminMenu {
  return {
    id,
    treatmentDetail: stringValue(data.treatmentDetail, "名称未設定"),
    menuIntroduction: stringValue(data.menuIntroduction),
    treatmentDetailList: stringArray(data.treatmentDetailList),
    menuImageUrl: imageUrlValue(data.menuImageUrl),
    menuImagePath: stringValue(data.menuImagePath),
    treatmentTimeMinutes: numberValue(data.treatmentTime, 60),
    beforePrice: numberValue(data.beforePrice),
    afterPrice: numberValue(data.afterPrice),
    isCallable: data.isCallable === true,
    isNeedExtraMoney: data.isNeedExtraMoney === true,
    priority: numberValue(data.priority, 999),
    updatedAt: dateValue(data.updatedAt)?.toISOString() ?? null,
  };
}

function imageUrlValue(value: unknown) {
  const imageUrl = stringValue(value);
  return isCloudStorageImageUrl(imageUrl) ? imageUrl : "";
}

function isCloudStorageImageUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && (
      parsed.hostname === "firebasestorage.googleapis.com" ||
      parsed.hostname === "storage.googleapis.com"
    );
  } catch {
    return false;
  }
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
    previousVisitAt: null,
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
  pushTokenCount: number,
): AdminCustomer {
  const customerId = stringValue(data.uid, id);
  const splitName = `${stringValue(data.lastName)} ${stringValue(data.firstName)}`.trim();
  return {
    id: customerId,
    displayName: splitName || stringValue(data.name, "お客様"),
    email: stringValue(data.email),
    telephoneNumber: stringValue(data.telephoneNumber),
    dateOfBirth: displayDateValue(data.dateOfBirth),
    gender: stringValue(data.gender),
    sharedNote: notes.get(customerId) ?? "",
    pushTokenCount,
  };
}

function pushNotificationFromDocument(
  id: string,
  data: Record<string, unknown>,
  fallbackCreatedAt: Date,
): AdminPushNotification {
  const tokens = stringArray(data.deviceIdList);
  return {
    id: stringValue(data.notificationId, id),
    title: stringValue(data.title, "タイトル未設定"),
    content: stringValue(data.content),
    targetLabel: stringValue(data.person, "全ユーザー"),
    recipientDeviceCount: numberValue(data.recipientDeviceCount, new Set(tokens).size),
    createdAt: (dateValue(data.createdAt) ?? fallbackCreatedAt).toISOString(),
  };
}

function emailNotificationFromDocument(
  id: string,
  data: Record<string, unknown>,
  fallbackCreatedAt: Date,
): AdminEmailNotification {
  const status = stringValue(data.status);
  return {
    id: stringValue(data.notificationId, id),
    title: stringValue(data.title, "タイトル未設定"),
    content: stringValue(data.content),
    targetLabel: stringValue(data.person, "全ユーザー"),
    recipientEmailCount: numberValue(data.recipientEmailCount),
    status: status === "sent" || status === "failed" ? status : "queued",
    createdAt: (dateValue(data.createdAt) ?? fallbackCreatedAt).toISOString(),
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

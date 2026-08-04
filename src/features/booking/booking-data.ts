import "client-only";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { sanitizePhoneNumber } from "@/features/form-validation";

const cloudStorageImageHosts = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

export type BookingMenu = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  categories: string[];
  beforePrice: number | null;
  price: number;
  durationMinutes: number;
  isCallable: boolean;
  needsExtraMoney: boolean;
  priority: number;
};

export type TimeRange = {
  start: Date;
  end: Date;
};

export type BookingCatalog = {
  menus: BookingMenu[];
  openingMinutes: number;
  closingMinutes: number;
  slotIntervalMinutes: number;
  closedWeekdays: Set<number>;
  reservations: TimeRange[];
  restBlocks: TimeRange[];
  usesSampleMenus: boolean;
  availabilityIsLive: boolean;
};

export type BookingCustomerProfile = {
  name: string;
  phone: string;
};

const sampleMenus: BookingMenu[] = [
  {
    id: "sample-cut-color",
    title: "カット＋ハーブカラー",
    description: "髪質に合わせたカットと、頭皮にやさしいハーブカラーのメニューです。",
    imageUrl: "",
    categories: ["カット", "カラー"],
    beforePrice: 10300,
    price: 9550,
    durationMinutes: 120,
    isCallable: false,
    needsExtraMoney: false,
    priority: 1,
  },
  {
    id: "sample-head-spa",
    title: "リラックスヘッドスパ",
    description: "頭皮ケアとリラクゼーションを組み合わせたメニューです。",
    imageUrl: "",
    categories: ["ヘッドスパ"],
    beforePrice: 6600,
    price: 5500,
    durationMinutes: 60,
    isCallable: false,
    needsExtraMoney: false,
    priority: 2,
  },
  {
    id: "sample-hair-set",
    title: "洋装ヘアセット",
    description: "お出かけやイベント向けのヘアセットです。早朝はお電話でご相談ください。",
    imageUrl: "",
    categories: ["ヘアセット"],
    beforePrice: 4400,
    price: 3300,
    durationMinutes: 60,
    isCallable: true,
    needsExtraMoney: false,
    priority: 3,
  },
];

export async function loadBookingCatalog(uid?: string): Promise<BookingCatalog> {
  const database = firestore();
  let menus = sampleMenus;
  let usesSampleMenus = true;
  let openingMinutes = 9 * 60;
  let closingMinutes = 18 * 60;
  let slotIntervalMinutes = 30;
  let closedWeekdays = new Set<number>();

  const menuResult = await settled(async () => {
    const snapshot = await getDocs(
      query(collection(database, "menu"), orderBy("priority")),
    );
    return snapshot.docs.map((document) => menuFromDocument(document.id, document.data()));
  });

  if (menuResult && menuResult.length > 0) {
    menus = menuResult;
    usesSampleMenus = false;
  }

  const settings = await settled(async () => {
    const snapshot = await getDoc(doc(database, "settings", "businessHours"));
    return snapshot.data();
  });

  if (settings) {
    openingMinutes = minutesFromDayTime(settings.openingTime) ?? openingMinutes;
    closingMinutes = minutesFromDayTime(settings.closingTime) ?? closingMinutes;
    slotIntervalMinutes = positiveInteger(settings.slotIntervalMinutes) ?? slotIntervalMinutes;
    closedWeekdays = new Set(
      Array.isArray(settings.closedWeekdays)
        ? settings.closedWeekdays.map(numberValue).filter(isNumber)
        : [],
    );
  }

  const [reservationResult, userReservationResult, restResult] = await Promise.all([
    settled(async () => {
      const snapshot = await getDocs(collection(database, "reservation"));
      return snapshot.docs
        .filter((document) => !isCancelled(document.data().status))
        .map((document) => rangeFromData(document.data()))
        .filter(isTimeRange);
    }),
    settled(async () => {
      if (!uid) return [];
      const snapshot = await getDocs(
        collection(database, "users", uid, "reservations"),
      );
      return snapshot.docs
        .filter((document) => !isCancelled(document.data().status))
        .map((document) => rangeFromData(document.data()))
        .filter(isTimeRange);
    }),
    settled(async () => {
      const snapshot = await getDocs(collection(database, "rests"));
      return snapshot.docs.map((document) => rangeFromData(document.data())).filter(isTimeRange);
    }),
  ]);

  return {
    menus,
    openingMinutes,
    closingMinutes,
    slotIntervalMinutes,
    closedWeekdays,
    reservations: [...(reservationResult ?? []), ...(userReservationResult ?? [])],
    restBlocks: restResult ?? [],
    usesSampleMenus,
    availabilityIsLive:
      reservationResult !== null &&
      userReservationResult !== null &&
      restResult !== null,
  };
}

export async function loadBookingCustomerProfile(
  uid: string,
  fallbackName = "",
): Promise<BookingCustomerProfile> {
  const database = firestore();

  for (const collectionPath of ["users", "user"]) {
    const profile = await settled(async () => {
      const snapshot = await getDoc(doc(database, collectionPath, uid));
      return snapshot.exists() ? snapshot.data() : null;
    });

    if (profile) {
      return {
        name: profileName(profile) || fallbackName.trim(),
        phone: sanitizePhoneNumber(stringValue(
          profile.telephoneNumber ?? profile.phoneNumber ?? profile.phone,
        )),
      };
    }
  }

  return { name: fallbackName.trim(), phone: "" };
}

async function settled<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action();
  } catch {
    return null;
  }
}

function menuFromDocument(id: string, data: Record<string, unknown>): BookingMenu {
  return {
    id: stringValue(data.menuId) || id,
    title: stringValue(data.treatmentDetail) || "サロンメニュー",
    description: stringValue(data.menuIntroduction),
    imageUrl: cloudStorageImageUrl(data.menuImageUrl),
    categories: Array.isArray(data.treatmentDetailList)
      ? data.treatmentDetailList.map(stringValue).filter(Boolean)
      : [],
    beforePrice: positiveInteger(data.beforePrice),
    price: positiveInteger(data.afterPrice) ?? positiveInteger(data.beforePrice) ?? 0,
    durationMinutes: positiveInteger(data.treatmentTime) ?? 60,
    isCallable: booleanValue(data.isCallable),
    needsExtraMoney: booleanValue(data.isNeedExtraMoney),
    priority: positiveInteger(data.priority) ?? 999,
  };
}

function cloudStorageImageUrl(value: unknown) {
  const imageUrl = stringValue(value);
  if (!imageUrl) return "";

  try {
    const parsed = new URL(imageUrl);
    return parsed.protocol === "https:" && cloudStorageImageHosts.has(parsed.hostname)
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function rangeFromData(data: Record<string, unknown>): TimeRange | null {
  const start = dateValue(data.startAt ?? data.startTime);
  const end = dateValue(data.endAt ?? data.finishTime);
  return start && end ? { start, end } : null;
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function minutesFromDayTime(value: unknown) {
  if (typeof value === "string") {
    const [hour, minute] = value.split(":").map(Number);
    return Number.isInteger(hour) && Number.isInteger(minute)
      ? hour * 60 + minute
      : null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const hour = numberValue(record.hour);
  const minute = numberValue(record.minute) ?? 0;
  return hour === null ? null : hour * 60 + minute;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value?.toString().trim() ?? "";
}

function profileName(data: Record<string, unknown>) {
  const lastName = stringValue(data.lastName);
  const firstName = stringValue(data.firstName);
  const splitName = [lastName, firstName].filter(Boolean).join(" ");
  return splitName || stringValue(data.name) || stringValue(data.displayName);
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.replace(/[^0-9-]/g, ""), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function positiveInteger(value: unknown) {
  const number = numberValue(value);
  return number !== null && number >= 0 ? number : null;
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === "true" || value === "1";
}

function isCancelled(value: unknown) {
  const status = stringValue(value).toLowerCase();
  return status === "canceled" || status === "cancelled" || status === "キャンセル";
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function isTimeRange(value: TimeRange | null): value is TimeRange {
  return value !== null;
}

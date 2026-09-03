import "client-only";

import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore } from "@/lib/firebase/firestore";
import { firebaseFunctions } from "@/lib/firebase/functions";
import { sanitizePhoneNumber } from "@/features/form-validation";
import {
  type BookingAvailability,
  bookingAvailabilityFromData,
  unavailableBookingAvailability,
} from "@/features/booking/booking-availability";
import { sortMenusByPriorityAndPrice } from "@/features/booking/booking-menu-sort";

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

export type BookingCatalog = BookingAvailability & {
  menus: BookingMenu[];
  usesSampleMenus: boolean;
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

export async function loadBookingMenus(): Promise<BookingCatalog> {
  const database = firestore();
  let menus = sortMenusByPriorityAndPrice(sampleMenus);
  let usesSampleMenus = true;

  const menuResult = await settled(async () => {
    const snapshot = await getDocs(collection(database, "menu"));
    return sortMenusByPriorityAndPrice(
      snapshot.docs.map((document) => menuFromDocument(document.id, document.data())),
    );
  });

  if (menuResult && menuResult.length > 0) {
    menus = menuResult;
    usesSampleMenus = false;
  }

  return {
    menus,
    ...unavailableBookingAvailability(),
    usesSampleMenus,
  };
}

export async function loadBookingAvailability(args: {
  from: Date;
  until: Date;
}): Promise<BookingAvailability> {
  return (
    (await settled(async () => {
      const getAvailability = httpsCallable<
        { from: string; until: string },
        unknown
      >(firebaseFunctions(), "getReservationAvailability");
      const result = await getAvailability({
        from: args.from.toISOString(),
        until: args.until.toISOString(),
      });
      return bookingAvailabilityFromData(result.data);
    })) ?? unavailableBookingAvailability()
  );
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
    beforePrice: strictlyPositiveInteger(data.beforePrice),
    price: positiveInteger(data.afterPrice) ?? positiveInteger(data.beforePrice) ?? 0,
    durationMinutes: positiveInteger(data.treatmentTime) ?? 60,
    isCallable: booleanValue(data.isCallable),
    needsExtraMoney: booleanValue(data.isNeedExtraMoney),
    priority: positiveInteger(data.priority) ?? 999,
  };
}

export function cloudStorageImageUrl(value: unknown) {
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

function strictlyPositiveInteger(value: unknown) {
  const number = numberValue(value);
  return number !== null && number > 0 ? number : null;
}

function booleanValue(value: unknown) {
  return value === true || value === 1 || value === "true" || value === "1";
}

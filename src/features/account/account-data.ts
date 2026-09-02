import "client-only";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase/firestore";
import { cloudStorageImageUrl } from "@/features/booking/booking-data";
import { customerProfileValidationMessage } from "@/features/form-validation";

export type CustomerProfile = {
  uid: string;
  email: string;
  lastName: string;
  firstName: string;
  telephoneNumber: string;
  gender: "男性" | "女性" | "その他";
  dateOfBirth: string;
};

export type CustomerReservation = {
  id: string;
  menuName: string;
  menuImageUrl: string;
  startAt: Date;
  endAt: Date | null;
  durationMinutes: number;
  price: number | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  request: string;
};

export type CustomerAccountSnapshot = {
  profile: CustomerProfile;
  reservations: CustomerReservation[];
};

export type CustomerProfileInput = Omit<CustomerProfile, "uid" | "email">;

export async function loadCustomerAccount(
  uid: string,
  email: string,
  fallbackDisplayName = "",
): Promise<CustomerAccountSnapshot> {
  const [profile, reservations] = await Promise.all([
    loadCustomerProfile(uid, email, fallbackDisplayName),
    loadCustomerReservations(uid),
  ]);

  return { profile, reservations };
}

export async function loadCustomerProfile(
  uid: string,
  email: string,
  fallbackDisplayName = "",
): Promise<CustomerProfile> {
  const database = firestore();
  let lastError: unknown;

  for (const collectionPath of ["users", "user"]) {
    try {
      const snapshot = await getDoc(doc(database, collectionPath, uid));
      if (snapshot.exists()) {
        return profileFromData(uid, email, snapshot.data(), fallbackDisplayName);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return profileFromData(uid, email, {}, fallbackDisplayName);
}

export async function saveCustomerProfile(
  uid: string,
  input: CustomerProfileInput,
) {
  const validationMessage = customerProfileValidationMessage(input);
  if (validationMessage) throw new TypeError(validationMessage);

  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();

  await setDoc(
    doc(firestore(), "users", uid),
    {
      uid,
      name: `${lastName} ${firstName}`,
      lastName,
      firstName,
      telephoneNumber: input.telephoneNumber,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

async function loadCustomerReservations(uid: string) {
  const database = firestore();
  const sources = await Promise.allSettled([
    getDocs(query(collection(database, "users", uid, "reservations"), limit(50))),
    getDocs(
      query(
        collection(database, "reservation"),
        where("uid", "==", uid),
        limit(50),
      ),
    ),
  ]);

  if (sources.every((source) => source.status === "rejected")) {
    const failedSource = sources.find(
      (source): source is PromiseRejectedResult => source.status === "rejected",
    );
    throw failedSource?.reason ?? new Error("予約情報を読み込めませんでした。");
  }

  const reservationsById = new Map<string, CustomerReservation>();
  for (const source of sources) {
    if (source.status === "rejected") continue;
    for (const document of source.value.docs) {
      const reservation = reservationFromData(document.id, document.data());
      if (reservation && !reservationsById.has(reservation.id)) {
        reservationsById.set(reservation.id, reservation);
      }
    }
  }

  return [...reservationsById.values()].sort(
    (left, right) => right.startAt.getTime() - left.startAt.getTime(),
  );
}

function profileFromData(
  uid: string,
  email: string,
  data: Record<string, unknown>,
  fallbackDisplayName: string,
): CustomerProfile {
  const name = stringValue(data.name) || fallbackDisplayName.trim();
  const nameParts = splitName(name);
  const gender = stringValue(data.gender);

  return {
    uid,
    email,
    lastName: stringValue(data.lastName) || nameParts.lastName,
    firstName: stringValue(data.firstName) || nameParts.firstName,
    telephoneNumber: stringValue(
      data.telephoneNumber ?? data.phoneNumber ?? data.phone,
    ),
    gender: gender === "男性" || gender === "女性" ? gender : "その他",
    dateOfBirth: dateString(data.dateOfBirth),
  };
}

function reservationFromData(
  fallbackId: string,
  data: Record<string, unknown>,
): CustomerReservation | null {
  const startAt = dateValue(data.startAt ?? data.startTime);
  if (!startAt) return null;

  const endAt = dateValue(data.endAt ?? data.finishTime);
  const durationMinutes =
    numberValue(data.durationMinutes ?? data.treatmentTime) ??
    (endAt ? Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60_000)) : 0);

  return {
    id: stringValue(data.reservationId) || fallbackId,
    menuName:
      stringValue(data.menuName ?? data.treatmentDetail) || "サロンメニュー",
    menuImageUrl: cloudStorageImageUrl(
      data.menuImageUrl ??
        (isRecord(data.menuSnapshot) ? data.menuSnapshot.imageUrl : undefined),
    ),
    startAt,
    endAt,
    durationMinutes,
    price: numberValue(data.price ?? data.afterPrice ?? data.beforePrice),
    status: reservationStatus(data.status),
    request: stringValue(data.request ?? data.customerHope ?? data.note),
  };
}

function reservationStatus(value: unknown): CustomerReservation["status"] {
  const status = stringValue(value).toLowerCase();
  if (["cancelled", "canceled", "キャンセル"].includes(status)) return "cancelled";
  if (["completed", "complete", "visited", "来店済み", "施術済み"].includes(status)) {
    return "completed";
  }
  if (status === "pending") return "pending";
  return "confirmed";
}

function splitName(value: string) {
  const parts = value.split(/[\s\u3000]+/).filter(Boolean);
  return {
    lastName: parts[0] ?? "",
    firstName: parts.slice(1).join(" "),
  };
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateString(value: unknown) {
  if (typeof value === "string") return value.slice(0, 10);
  return dateValue(value)?.toISOString().slice(0, 10) ?? "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[^0-9-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import "client-only";

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { firebaseFunctions } from "@/lib/firebase/client";
import { bookingCustomerValidationMessage } from "@/features/form-validation";

export type CreateBookingReservationInput = {
  menuId: string;
  startAt: string;
  customerName: string;
  telephoneNumber: string;
  request: string;
};

type CreateBookingReservationResult = {
  reservationId: string;
};

type CancelBookingReservationResult = {
  reservationId: string;
  status: "cancelled";
  alreadyCancelled: boolean;
};

export async function createBookingReservation(
  input: CreateBookingReservationInput,
) {
  const validationMessage = bookingCustomerValidationMessage(input);
  if (validationMessage) throw new TypeError(validationMessage);

  const createReservation = httpsCallable<
    CreateBookingReservationInput,
    CreateBookingReservationResult
  >(firebaseFunctions(), "createReservation");
  const result = await createReservation(input);
  return result.data;
}

export async function cancelBookingReservation(reservationId: string) {
  const cancelReservation = httpsCallable<
    { reservationId: string },
    CancelBookingReservationResult
  >(firebaseFunctions(), "cancelWebReservation");
  const result = await cancelReservation({ reservationId });
  return result.data;
}

export function bookingReservationErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "予約を確定できませんでした。通信状況をご確認のうえ、もう一度お試しください。";
  }

  switch (error.code) {
    case "functions/unauthenticated":
      return "ログインの有効期限が切れています。再度ログインしてください。";
    case "functions/already-exists":
      return "選択された日時は直前に予約されました。別の日時を選択してください。";
    case "functions/failed-precondition":
    case "functions/not-found":
    case "functions/invalid-argument":
      return error.message || "予約内容を確認してください。";
    case "functions/unavailable":
    case "functions/deadline-exceeded":
      return "予約サーバーへ接続できませんでした。少し時間をおいて再度お試しください。";
    default:
      return "予約を確定できませんでした。時間をおいてもう一度お試しください。";
  }
}

export function bookingCancellationErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "予約をキャンセルできませんでした。通信状況をご確認のうえ、もう一度お試しください。";
  }

  switch (error.code) {
    case "functions/unauthenticated":
      return "ログインの有効期限が切れています。再度ログインしてください。";
    case "functions/permission-denied":
      return "この予約をキャンセルする権限がありません。";
    case "functions/failed-precondition":
    case "functions/not-found":
    case "functions/invalid-argument":
      return error.message || "予約内容を再読み込みしてご確認ください。";
    case "functions/unavailable":
    case "functions/deadline-exceeded":
      return "予約サーバーへ接続できませんでした。少し時間をおいて再度お試しください。";
    default:
      return "予約をキャンセルできませんでした。時間をおいてもう一度お試しください。";
  }
}

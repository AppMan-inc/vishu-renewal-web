import type { Auth, AuthError } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { FORM_FIELD_LIMITS } from "../form-validation.ts";
import { safeCustomerReturnTo } from "./return-to.ts";

type SendPasswordReset = (auth: Auth, email: string) => Promise<void>;

export function customerPasswordResetHref(
  returnTo: string | null | undefined,
  email?: string | null,
) {
  const params = new URLSearchParams();
  const normalizedEmail = email?.trim();
  const destination = safeCustomerReturnTo(returnTo);

  if (normalizedEmail) params.set("email", normalizedEmail);
  if (destination !== "/mypage") params.set("returnTo", destination);

  const query = params.toString();
  return query ? `/password-reset?${query}` : "/password-reset";
}

export function passwordResetEmailValidationMessage(value: string) {
  const email = value.trim();
  if (!email) return "メールアドレスを入力してください。";
  if (
    value.length > FORM_FIELD_LIMITS.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return "メールアドレスの形式を確認してください。";
  }
  return null;
}

export async function requestCustomerPasswordReset(
  auth: Auth,
  email: string,
  sendReset: SendPasswordReset = sendPasswordResetEmail,
) {
  auth.languageCode = "ja";

  try {
    await sendReset(auth, email.trim());
  } catch (error) {
    // Do not reveal whether an account exists for the entered address.
    if ((error as Partial<AuthError>)?.code === "auth/user-not-found") return;
    throw error;
  }
}

export function customerPasswordResetErrorMessage(error: unknown) {
  const code = (error as Partial<AuthError>)?.code;

  switch (code) {
    case "auth/invalid-email":
      return "メールアドレスの形式を確認してください。";
    case "auth/network-request-failed":
      return "通信環境を確認して、もう一度お試しください。";
    case "auth/too-many-requests":
      return "送信回数が多すぎます。時間をおいて、もう一度お試しください。";
    case "auth/operation-not-allowed":
      return "パスワード再設定は現在ご利用いただけません。";
    default:
      return "再設定メールを送信できませんでした。時間をおいて、もう一度お試しください。";
  }
}

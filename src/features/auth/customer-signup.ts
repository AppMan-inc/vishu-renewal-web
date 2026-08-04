import type { Auth, AuthError, UserCredential } from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { safeCustomerReturnTo } from "./return-to.ts";
import { hasValidEmailLength } from "../form-validation.ts";

export type CustomerSignupValues = {
  email: string;
  password: string;
  passwordConfirmation: string;
};

export type CustomerSignupField = keyof CustomerSignupValues;
export type CustomerSignupErrors = Partial<
  Record<CustomerSignupField, string>
>;

type CreateEmailUser = (
  auth: Auth,
  email: string,
  password: string,
) => Promise<UserCredential>;

type BooleanRef = { current: boolean };

export function validateCustomerSignup(
  values: CustomerSignupValues,
): CustomerSignupErrors {
  const errors: CustomerSignupErrors = {};
  const email = values.email.trim();

  if (!email) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!hasValidEmailLength(email)) {
    errors.email = "メールアドレスは50文字以内で入力してください。";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "正しい形式のメールアドレスを入力してください。";
  }

  if (!values.password) {
    errors.password = "パスワードを入力してください。";
  } else if (values.password.length < 6) {
    errors.password = "パスワードは6文字以上で入力してください。";
  }

  if (!values.passwordConfirmation) {
    errors.passwordConfirmation = "確認用パスワードを入力してください。";
  } else if (values.password !== values.passwordConfirmation) {
    errors.passwordConfirmation = "パスワードが一致しません。";
  }

  return errors;
}

export function customerSignupDestination(
  returnTo: string | null | undefined,
) {
  return safeCustomerReturnTo(returnTo);
}

export function customerSignupHref(returnTo: string | null | undefined) {
  const destination = customerSignupDestination(returnTo);
  return destination === "/mypage"
    ? "/signup"
    : `/signup?returnTo=${encodeURIComponent(destination)}`;
}

export function customerLoginHref(returnTo: string | null | undefined) {
  const destination = customerSignupDestination(returnTo);
  return destination === "/mypage"
    ? "/login"
    : `/login?returnTo=${encodeURIComponent(destination)}`;
}

export async function createCustomerAccount(
  auth: Auth,
  values: Pick<CustomerSignupValues, "email" | "password">,
  createEmailUser: CreateEmailUser = createUserWithEmailAndPassword,
) {
  const email = values.email.trim();
  if (!hasValidEmailLength(email)) {
    throw new TypeError("メールアドレスは50文字以内で入力してください。");
  }
  return createEmailUser(auth, email, values.password);
}

export function claimCustomerSignupSubmission(
  submissionInProgress: BooleanRef,
  navigationStarted: BooleanRef,
) {
  if (submissionInProgress.current || navigationStarted.current) return false;
  submissionInProgress.current = true;
  return true;
}

export function customerSignupErrorMessage(error: unknown) {
  const code = (error as Partial<AuthError>)?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "このメールアドレスはすでに登録されています。ログインをお試しください。";
    case "auth/invalid-email":
      return "メールアドレスの形式を確認してください。";
    case "auth/weak-password":
      return "パスワードが短すぎます。6文字以上で入力してください。";
    case "auth/password-does-not-meet-requirements":
      return "パスワードがセキュリティ要件を満たしていません。別のパスワードをお試しください。";
    case "auth/network-request-failed":
      return "通信できませんでした。ネットワーク接続を確認してください。";
    case "auth/too-many-requests":
      return "試行回数が多すぎます。時間をおいて再度お試しください。";
    case "auth/operation-not-allowed":
      return "メールアドレスでのアカウント作成は現在利用できません。";
    default:
      return "アカウントを作成できませんでした。時間をおいて再度お試しください。";
  }
}

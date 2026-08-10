export const FORM_FIELD_LIMITS = {
  personName: 30,
  email: 50,
  phone: 11,
  inquiryMessage: 300,
} as const;

export const PHONE_DIGITS_ONLY_MESSAGE =
  "電話番号は半角数字のみで入力してください。";
export const PHONE_MAX_LENGTH_MESSAGE =
  "電話番号は11桁以内で入力してください。";

export type PhoneInputResult = {
  value: string;
  inputError: string | null;
};

export function phoneInputResult(rawValue: string): PhoneInputResult {
  const digitsOnly = rawValue.replace(/[^0-9]/g, "");
  return {
    value: digitsOnly.slice(0, FORM_FIELD_LIMITS.phone),
    inputError: digitsOnly.length > FORM_FIELD_LIMITS.phone
      ? PHONE_MAX_LENGTH_MESSAGE
      : rawValue !== digitsOnly
        ? PHONE_DIGITS_ONLY_MESSAGE
        : null,
  };
}

export function phoneFieldChangeResult(
  rawValue: string,
  currentError?: string,
) {
  const result = phoneInputResult(rawValue);
  if (result.inputError) return { value: result.value, error: result.inputError };
  const wasTransient = currentError === PHONE_DIGITS_ONLY_MESSAGE
    || currentError === PHONE_MAX_LENGTH_MESSAGE;
  return {
    value: result.value,
    error: currentError && !wasTransient
      ? requiredPhoneValidationMessage(result.value)
      : null,
  };
}

export function sanitizePhoneNumber(value: string) {
  return phoneInputResult(value).value;
}

export function emailValidationMessage(value: string) {
  const email = value.trim();
  if (!email) return "メールアドレスを入力してください。";
  if (value.length > FORM_FIELD_LIMITS.email) {
    return "メールアドレスは50文字以内で入力してください。";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "正しいメールアドレスを入力してください。";
  }
  return null;
}

export type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

export function loginValidationErrors(values: {
  email: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const emailError = emailValidationMessage(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = "パスワードを入力してください。";
  return errors;
}

export function loginAuthErrorMessage(
  error: unknown,
  method?: "email" | "google" | "apple",
) {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "メールアドレスまたはパスワードが正しくありません。";
    case "auth/network-request-failed":
      return "通信状況を確認して、もう一度お試しください。";
    case "auth/too-many-requests":
      return "ログイン試行回数が多すぎます。時間をおいて再度お試しください。";
    case "auth/popup-blocked":
      return "ログイン画面を開けませんでした。ポップアップを許可して再度お試しください。";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "ログインがキャンセルされました。";
    case "auth/operation-not-allowed":
      if (method === "apple") {
        return "Appleログインは現在利用できません。別のログイン方法をお試しください。";
      }
      return "このログイン方法は現在利用できません。";
    case "auth/unauthorized-domain":
      return "このドメインではログインできません。Firebase Authenticationの承認済みドメインを確認してください。";
    case "auth/invalid-api-key":
      return "FirebaseのAPIキー設定を確認してください。";
    default:
      return "ログインできませんでした。時間をおいて再度お試しください。";
  }
}

export function personNameValidationMessage(
  value: string,
  label: "姓" | "名" | "お名前",
) {
  if (!value.trim()) return `${label}を入力してください。`;
  if (value.length > FORM_FIELD_LIMITS.personName) {
    return `${label}は30文字以内で入力してください。`;
  }
  return null;
}

export function customerProfileValidationMessage(input: {
  lastName: string;
  firstName: string;
  telephoneNumber: string;
}) {
  return personNameValidationMessage(input.lastName, "姓")
    ?? personNameValidationMessage(input.firstName, "名")
    ?? requiredPhoneValidationMessage(input.telephoneNumber);
}

export function bookingCustomerValidationMessage(input: {
  customerName: string;
  telephoneNumber: string;
  request: string;
}) {
  const customerError = personNameValidationMessage(input.customerName, "お名前")
    ?? requiredPhoneValidationMessage(input.telephoneNumber);
  if (customerError) return customerError;
  if (input.request.length > FORM_FIELD_LIMITS.inquiryMessage) {
    return "ご要望・ご相談は300文字以内で入力してください。";
  }
  return null;
}

export function hasValidEmailLength(value: string) {
  return value.length <= FORM_FIELD_LIMITS.email;
}

export function requiredPhoneValidationMessage(value: string) {
  if (!value) return "電話番号を入力してください。";
  if (!/^[0-9]+$/.test(value)) return PHONE_DIGITS_ONLY_MESSAGE;
  if (value.length < 10 || value.length > FORM_FIELD_LIMITS.phone) {
    return "電話番号は10桁または11桁で入力してください。";
  }
  return null;
}

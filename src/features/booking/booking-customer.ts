import {
  FORM_FIELD_LIMITS,
  personNameValidationMessage,
  requiredPhoneValidationMessage,
} from "../form-validation.ts";

export type BookingGender = "" | "男性" | "女性" | "その他";
export type BookingFieldErrors = Partial<Record<
  "lastName" | "firstName" | "gender" | "phone" | "request", string
>>;

export function bookingCustomerNames(data: Record<string, unknown>, fallbackName = "") {
  const lastName = text(data.lastName);
  const firstName = text(data.firstName);
  if (lastName || firstName) return { lastName, firstName };

  const parts = (text(data.name) || text(data.displayName) || fallbackName.trim())
    .split(/[\s\u3000]+/).filter(Boolean);
  // A name without a separator needs the customer's confirmation.
  return { lastName: parts[0] ?? "", firstName: parts.slice(1).join(" ") };
}

export function bookingGender(value: unknown): BookingGender {
  return value === "男性" || value === "女性" || value === "その他" ? value : "";
}

export function bookingFieldErrors(input: {
  lastName: string;
  firstName: string;
  gender: string;
  phone: string;
  request: string;
}): BookingFieldErrors {
  return {
    lastName: personNameValidationMessage(input.lastName, "姓") ?? undefined,
    firstName: personNameValidationMessage(input.firstName, "名") ?? undefined,
    gender: bookingGender(input.gender) ? undefined : "性別を選択してください。",
    phone: requiredPhoneValidationMessage(input.phone) ?? undefined,
    request: input.request.length > FORM_FIELD_LIMITS.inquiryMessage
      ? "ご要望・ご相談は300文字以内で入力してください。"
      : undefined,
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

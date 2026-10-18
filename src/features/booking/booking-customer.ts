import {
  FORM_FIELD_LIMITS,
  personNameValidationMessage,
  requiredPhoneValidationMessage,
} from "../form-validation.ts";

export type BookingGender = "" | "男性" | "女性" | "その他";
export type BookingFieldErrors = Partial<Record<
  "lastName" | "firstName" | "gender" | "dateOfBirth" | "phone" | "request", string
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

export function bookingTodayDate(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dateOfBirthValidationMessage(value: string, today = bookingTodayDate()) {
  if (!value) return "生年月日を入力してください。";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "生年月日を正しく入力してください。";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return "生年月日を正しく入力してください。";
  }
  if (value < "1920-01-01") return "生年月日は1920年1月1日以降で入力してください。";
  if (value > today) return "生年月日は今日以前の日付で入力してください。";
  return null;
}

export function bookingDateOfBirth(value: unknown): string {
  if (value instanceof Date) return Number.isFinite(value.getTime())
    ? bookingDateOfBirth(bookingTodayDate(value)) : "";
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return bookingDateOfBirth(value.toDate());
  }
  if (typeof value !== "string") return "";
  const match = value.trim().match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})(?:日)?(?:T.*)?$/);
  if (!match) return "";
  const normalized = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  return dateOfBirthValidationMessage(normalized) ? "" : normalized;
}

export function bookingFieldErrors(input: {
  lastName: string;
  firstName: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  request: string;
}): BookingFieldErrors {
  return {
    lastName: personNameValidationMessage(input.lastName, "姓") ?? undefined,
    firstName: personNameValidationMessage(input.firstName, "名") ?? undefined,
    gender: bookingGender(input.gender) ? undefined : "性別を選択してください。",
    dateOfBirth: dateOfBirthValidationMessage(input.dateOfBirth) ?? undefined,
    phone: requiredPhoneValidationMessage(input.phone) ?? undefined,
    request: input.request.length > FORM_FIELD_LIMITS.inquiryMessage
      ? "ご要望・ご相談は300文字以内で入力してください。"
      : undefined,
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

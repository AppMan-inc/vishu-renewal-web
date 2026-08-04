export const FORM_FIELD_LIMITS = {
  personName: 30,
  email: 50,
  phone: 11,
  inquiryMessage: 300,
} as const;

export function sanitizePhoneNumber(value: string) {
  return value.replace(/[^0-9]/g, "").slice(0, FORM_FIELD_LIMITS.phone);
}

export function customerProfileValidationMessage(input: {
  lastName: string;
  firstName: string;
  telephoneNumber: string;
}) {
  if (!input.lastName.trim() || !input.firstName.trim()) {
    return "姓と名を入力してください。";
  }
  if (input.lastName.trim().length > FORM_FIELD_LIMITS.personName) {
    return "姓は30文字以内で入力してください。";
  }
  if (input.firstName.trim().length > FORM_FIELD_LIMITS.personName) {
    return "名は30文字以内で入力してください。";
  }
  return requiredPhoneValidationMessage(input.telephoneNumber);
}

export function bookingCustomerValidationMessage(input: {
  customerName: string;
  telephoneNumber: string;
  request: string;
}) {
  if (!input.customerName.trim()) return "お名前を入力してください。";
  if (input.customerName.trim().length > FORM_FIELD_LIMITS.personName) {
    return "お名前は30文字以内で入力してください。";
  }
  const phoneError = requiredPhoneValidationMessage(input.telephoneNumber);
  if (phoneError) return phoneError;
  if (input.request.trim().length > FORM_FIELD_LIMITS.inquiryMessage) {
    return "ご要望・ご相談は300文字以内で入力してください。";
  }
  return null;
}

export function hasValidEmailLength(value: string) {
  return value.trim().length <= FORM_FIELD_LIMITS.email;
}

function requiredPhoneValidationMessage(value: string) {
  if (!/^[0-9]+$/.test(value)) {
    return "電話番号は半角数字のみで入力してください。";
  }
  if (value.length < 10 || value.length > FORM_FIELD_LIMITS.phone) {
    return "電話番号は10〜11桁で入力してください。";
  }
  return null;
}

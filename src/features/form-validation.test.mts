import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingCustomerValidationMessage,
  customerProfileValidationMessage,
  emailValidationMessage,
  hasValidEmailLength,
  loginAuthErrorMessage,
  loginValidationErrors,
  personNameValidationMessage,
  phoneFieldChangeResult,
  phoneInputResult,
  PHONE_DIGITS_ONLY_MESSAGE,
  PHONE_MAX_LENGTH_MESSAGE,
  requiredPhoneValidationMessage,
  sanitizePhoneNumber,
} from "./form-validation.ts";

const validProfile = {
  lastName: "山田",
  firstName: "Alex",
  telephoneNumber: "09012345678",
};

test("person-name fields accept 29 and 30 characters and reject 31", () => {
  for (const length of [29, 30]) {
    assert.equal(
      customerProfileValidationMessage({
        ...validProfile,
        lastName: "山".repeat(length),
      }),
      null,
    );
    assert.equal(
      bookingCustomerValidationMessage({
        customerName: "A".repeat(length),
        telephoneNumber: validProfile.telephoneNumber,
        request: "",
      }),
      null,
    );
  }

  assert.match(
    customerProfileValidationMessage({
      ...validProfile,
      firstName: "名".repeat(31),
    }) ?? "",
    /30文字以内/,
  );
  assert.match(
    bookingCustomerValidationMessage({
      customerName: "A".repeat(31),
      telephoneNumber: validProfile.telephoneNumber,
      request: "",
    }) ?? "",
    /30文字以内/,
  );
});

test("name validation uses field-specific required messages and accepts Japanese and international names", () => {
  assert.equal(personNameValidationMessage("", "姓"), "姓を入力してください。");
  assert.equal(personNameValidationMessage("", "名"), "名を入力してください。");
  assert.equal(personNameValidationMessage("", "お名前"), "お名前を入力してください。");
  assert.equal(personNameValidationMessage("山田 花子", "お名前"), null);
  assert.equal(personNameValidationMessage("Alex Smith", "お名前"), null);
  assert.equal(personNameValidationMessage("A".repeat(30), "お名前"), null);
  assert.equal(
    personNameValidationMessage("A".repeat(31), "お名前"),
    "お名前は30文字以内で入力してください。",
  );
});

test("email fields accept 49 and 50 characters and reject 51", () => {
  assert.equal(hasValidEmailLength(`${"a".repeat(44)}@a.co`), true);
  assert.equal(hasValidEmailLength(`${"a".repeat(45)}@a.co`), true);
  assert.equal(hasValidEmailLength(`${"a".repeat(46)}@a.co`), false);
  assert.equal(emailValidationMessage(""), "メールアドレスを入力してください。");
  assert.equal(emailValidationMessage("not-an-email"), "正しいメールアドレスを入力してください。");
  assert.equal(emailValidationMessage(`${"a".repeat(45)}@a.co`), null);
  assert.equal(
    emailValidationMessage(`${"a".repeat(46)}@a.co`),
    "メールアドレスは50文字以内で入力してください。",
  );
});

test("login validation and Firebase errors use secure approved messages", () => {
  assert.deepEqual(loginValidationErrors({ email: "", password: "" }), {
    email: "メールアドレスを入力してください。",
    password: "パスワードを入力してください。",
  });
  for (const code of [
    "auth/invalid-credential",
    "auth/invalid-email",
    "auth/user-not-found",
    "auth/wrong-password",
  ]) {
    assert.equal(
      loginAuthErrorMessage({ code }),
      "メールアドレスまたはパスワードが正しくありません。",
    );
  }
  assert.equal(
    loginAuthErrorMessage({ code: "auth/network-request-failed" }),
    "通信状況を確認して、もう一度お試しください。",
  );
});

test("phone sanitization keeps only the first 11 ASCII digits", () => {
  const cases = [
    ["09012345678", "09012345678"],
    ["090-1234-5678", "09012345678"],
    ["090 1234 5678", "09012345678"],
    ["abc09012345678", "09012345678"],
    ["090(1234)5678", "09012345678"],
    ["+81-90-1234-5678", "81901234567"],
    ["０９０１２３４５６７８", ""],
    ["09😀0-12a34 5678!99", "09012345678"],
  ] as const;

  for (const [input, expected] of cases) {
    assert.equal(sanitizePhoneNumber(input), expected, input);
  }
});

test("phone input reports invalid attempts while retaining only up to 11 ASCII digits", () => {
  assert.deepEqual(phoneInputResult("09012345678"), {
    value: "09012345678",
    inputError: null,
  });
  for (const rawValue of [
    "090-1234-5678",
    "090 1234 5678",
    "abc09012345678",
    "090(1234)5678",
    "090😀1234!5678",
    "０９０１２３４５６７８",
  ]) {
    assert.equal(phoneInputResult(rawValue).inputError, PHONE_DIGITS_ONLY_MESSAGE);
    assert.match(phoneInputResult(rawValue).value, /^[0-9]*$/);
  }
  assert.deepEqual(phoneInputResult("090123456789"), {
    value: "09012345678",
    inputError: PHONE_MAX_LENGTH_MESSAGE,
  });
  assert.equal(
    phoneInputResult("090-1234-5678-9").inputError,
    PHONE_MAX_LENGTH_MESSAGE,
  );
});

test("phone transient errors clear on the next valid edit while semantic errors update", () => {
  assert.deepEqual(
    phoneFieldChangeResult("09012345678", PHONE_DIGITS_ONLY_MESSAGE),
    { value: "09012345678", error: null },
  );
  assert.deepEqual(
    phoneFieldChangeResult("09012345678", PHONE_MAX_LENGTH_MESSAGE),
    { value: "09012345678", error: null },
  );
  assert.deepEqual(
    phoneFieldChangeResult("090123456", "電話番号は10桁または11桁で入力してください。"),
    {
      value: "090123456",
      error: "電話番号は10桁または11桁で入力してください。",
    },
  );
  assert.deepEqual(
    phoneFieldChangeResult("0901234567", "電話番号は10桁または11桁で入力してください。"),
    { value: "0901234567", error: null },
  );
});

test("required phone validation accepts 10 or 11 digits and rejects bypasses", () => {
  for (const telephoneNumber of ["0721234567", "09012345678"]) {
    assert.equal(
      customerProfileValidationMessage({ ...validProfile, telephoneNumber }),
      null,
    );
  }

  for (const telephoneNumber of [
    "090123456789",
    "090-1234-5678",
    "090 1234 5678",
    "090(1234)5678",
    "０９０１２３４５６７８",
    "0901234😀5678",
  ]) {
    assert.notEqual(
      customerProfileValidationMessage({ ...validProfile, telephoneNumber }),
      null,
      telephoneNumber,
    );
  }
  assert.equal(requiredPhoneValidationMessage(""), "電話番号を入力してください。");
  assert.equal(
    requiredPhoneValidationMessage("090123456"),
    "電話番号は10桁または11桁で入力してください。",
  );
});

test("inquiry messages accept 299 and 300 characters and reject 301", () => {
  for (const length of [299, 300]) {
    assert.equal(
      bookingCustomerValidationMessage({
        customerName: "山田 花子",
        telephoneNumber: validProfile.telephoneNumber,
        request: "髪".repeat(length),
      }),
      null,
    );
  }
  assert.match(
    bookingCustomerValidationMessage({
      customerName: "山田 花子",
      telephoneNumber: validProfile.telephoneNumber,
      request: "髪".repeat(301),
    }) ?? "",
    /300文字以内/,
  );
});

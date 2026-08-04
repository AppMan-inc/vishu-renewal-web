import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingCustomerValidationMessage,
  customerProfileValidationMessage,
  hasValidEmailLength,
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

test("email fields accept 49 and 50 characters and reject 51", () => {
  assert.equal(hasValidEmailLength(`${"a".repeat(44)}@a.co`), true);
  assert.equal(hasValidEmailLength(`${"a".repeat(45)}@a.co`), true);
  assert.equal(hasValidEmailLength(`${"a".repeat(46)}@a.co`), false);
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

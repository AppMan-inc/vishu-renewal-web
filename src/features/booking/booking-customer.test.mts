import assert from "node:assert/strict";
import test from "node:test";
import { bookingCustomerNames, bookingFieldErrors, bookingGender } from "./booking-customer.ts";

test("stored separate names take precedence over an undivided display name", () => {
  assert.deepEqual(bookingCustomerNames({ lastName: "やすだ", firstName: "かつみ" }, "やすだかつみ"),
    { lastName: "やすだ", firstName: "かつみ" });
  assert.deepEqual(bookingCustomerNames({}, "やすだ　かつみ"),
    { lastName: "やすだ", firstName: "かつみ" });
});

test("undivided legacy names require the customer to confirm the first name", () => {
  const names = bookingCustomerNames({}, "やすだかつみ");
  assert.equal(names.firstName, "");
  assert.equal(bookingFieldErrors({ ...names, gender: "男性", phone: "09012345678", request: "" }).firstName,
    "名を入力してください。");
});

test("new bookings require both names and an explicitly selected gender", () => {
  const input = { lastName: "やすだ", firstName: "かつみ", gender: "男性", phone: "09012345678", request: "" };
  assert.equal(Object.values(bookingFieldErrors(input)).some(Boolean), false);
  assert.equal(bookingFieldErrors({ ...input, gender: "" }).gender, "性別を選択してください。");
  assert.equal(bookingGender(undefined), "");
  assert.equal(bookingGender("女性"), "女性");
  assert.equal(bookingGender("その他"), "その他");
});

test("each name has its own length limit", () => {
  const input = { lastName: "姓".repeat(30), firstName: "名".repeat(30), gender: "男性", phone: "09012345678", request: "" };
  assert.equal(Object.values(bookingFieldErrors(input)).some(Boolean), false);
  assert.match(bookingFieldErrors({ ...input, firstName: "名".repeat(31) }).firstName ?? "", /30文字以内/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { bookingCustomerNames, bookingDateOfBirth, bookingFieldErrors, bookingGender, bookingTodayDate, dateOfBirthValidationMessage } from "./booking-customer.ts";

test("stored separate names take precedence over an undivided display name", () => {
  assert.deepEqual(bookingCustomerNames({ lastName: "やすだ", firstName: "かつみ" }, "やすだかつみ"),
    { lastName: "やすだ", firstName: "かつみ" });
  assert.deepEqual(bookingCustomerNames({}, "やすだ　かつみ"),
    { lastName: "やすだ", firstName: "かつみ" });
});

test("undivided legacy names require the customer to confirm the first name", () => {
  const names = bookingCustomerNames({}, "やすだかつみ");
  assert.equal(names.firstName, "");
  assert.equal(bookingFieldErrors({ ...names, gender: "男性", dateOfBirth: "1980-01-01", phone: "09012345678", request: "" }).firstName,
    "名を入力してください。");
});

test("new bookings require both names and an explicitly selected gender", () => {
  const input = { lastName: "やすだ", firstName: "かつみ", gender: "男性", dateOfBirth: "1980-01-01", phone: "09012345678", request: "" };
  assert.equal(Object.values(bookingFieldErrors(input)).some(Boolean), false);
  assert.equal(bookingFieldErrors({ ...input, gender: "" }).gender, "性別を選択してください。");
  assert.equal(bookingGender(undefined), "");
  assert.equal(bookingGender("女性"), "女性");
  assert.equal(bookingGender("その他"), "その他");
});

test("each name has its own length limit", () => {
  const input = { lastName: "姓".repeat(30), firstName: "名".repeat(30), gender: "男性", dateOfBirth: "1980-01-01", phone: "09012345678", request: "" };
  assert.equal(Object.values(bookingFieldErrors(input)).some(Boolean), false);
  assert.match(bookingFieldErrors({ ...input, firstName: "名".repeat(31) }).firstName ?? "", /30文字以内/);
});

test("birthday is mandatory and must be an actual date that is not in the future", () => {
  const today = "2026-10-18";
  for (const valid of ["1920-01-01", "2000-02-29", today]) {
    assert.equal(dateOfBirthValidationMessage(valid, today), null);
  }
  for (const invalid of ["", "2001-02-29", "2026-04-31", "2026-13-01", "2026-10-19", "1919-12-31", "1980年1月1日"]) {
    assert.ok(dateOfBirthValidationMessage(invalid, today), invalid);
  }
  const input = { lastName: "やすだ", firstName: "かつみ", gender: "男性", dateOfBirth: "", phone: "09012345678", request: "" };
  assert.equal(bookingFieldErrors(input).dateOfBirth, "生年月日を入力してください。");
});

test("existing app and web birthdays are normalized for the booking date input", () => {
  for (const saved of ["1980年1月2日", "1980/1/2", "1980-01-02", "1980-01-02T00:00:00Z"]) {
    assert.equal(bookingDateOfBirth(saved), "1980-01-02");
  }
  assert.equal(bookingDateOfBirth({ toDate: () => new Date("1980-01-01T15:00:00Z") }), "1980-01-02");
  for (const invalid of [undefined, "", "2001年2月29日", new Date("invalid")]) {
    assert.equal(bookingDateOfBirth(invalid), "");
  }
});

test("today uses the salon's Japanese calendar date across UTC midnight", () => {
  assert.equal(bookingTodayDate(new Date("2026-10-17T14:59:59Z")), "2026-10-17");
  assert.equal(bookingTodayDate(new Date("2026-10-17T15:00:00Z")), "2026-10-18");
});

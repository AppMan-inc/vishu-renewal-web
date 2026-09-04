import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingCompleteHref,
  bookingLoginHref,
  bookingReturnTo,
} from "./booking-navigation.ts";

test("preserves the selected menu across login", () => {
  assert.equal(
    bookingReturnTo("cut & color"),
    "/booking?menuId=cut%20%26%20color",
  );
  assert.equal(
    bookingLoginHref("cut & color"),
    "/login?returnTo=%2Fbooking%3FmenuId%3Dcut%2520%2526%2520color",
  );
});

test("builds the booking completion URL without exposing booking details", () => {
  assert.equal(
    bookingCompleteHref("reservation/123 & confirmed"),
    "/booking/complete?reservationId=reservation%2F123%20%26%20confirmed",
  );
});

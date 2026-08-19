import assert from "node:assert/strict";
import test from "node:test";
import {
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

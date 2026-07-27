import assert from "node:assert/strict";
import test from "node:test";
import {
  isAdminReturnTo,
  loginIntent,
  safeAdminReturnTo,
  safeCustomerReturnTo,
} from "./return-to.ts";

test("normal customer login does not require admin authorization", () => {
  assert.deepEqual(loginIntent(null), {
    destination: "/mypage",
    requiresAdminAuthorization: false,
  });
  assert.deepEqual(loginIntent("/booking?step=confirm"), {
    destination: "/booking?step=confirm",
    requiresAdminAuthorization: false,
  });
});

test("unsafe and looping customer returnTo values use the customer default", () => {
  for (const value of [
    "https://example.com/steal",
    "//example.com/steal",
    "/\\example.com/steal",
    "/login",
    "/login?returnTo=/login",
    "/admin",
    "/admin/customers",
  ]) {
    assert.equal(safeCustomerReturnTo(value), "/mypage", value);
  }
});

test("admin returnTo requires authorization and preserves a safe destination", () => {
  assert.equal(isAdminReturnTo("/admin?section=today"), true);
  assert.deepEqual(loginIntent("/admin/customers"), {
    destination: "/admin/customers",
    requiresAdminAuthorization: true,
  });
  assert.equal(safeAdminReturnTo("/admin/login"), "/admin");
  assert.equal(isAdminReturnTo("/admin/login?returnTo=/admin"), false);
});

test("unsafe input cannot become an admin destination", () => {
  for (const value of [
    "https://example.com/admin",
    "//example.com/admin",
    "/\\example.com/admin",
    "/admin\\example.com",
  ]) {
    assert.equal(isAdminReturnTo(value), false, value);
    assert.equal(safeAdminReturnTo(value), "/admin", value);
    assert.equal(loginIntent(value).requiresAdminAuthorization, false, value);
  }
});

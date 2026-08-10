import assert from "node:assert/strict";
import test from "node:test";
import {
  isAdminReturnTo,
  loginIntent,
  safeAdminReturnTo,
  safeCustomerReturnTo,
} from "./return-to.ts";

test("every login checks whether the user is an admin", () => {
  assert.deepEqual(loginIntent(null), {
    destination: "/admin",
    requiresAdminAuthorization: true,
  });
  assert.deepEqual(loginIntent("  "), {
    destination: "/admin",
    requiresAdminAuthorization: true,
  });
  assert.deepEqual(loginIntent("/booking?step=confirm"), {
    destination: "/admin",
    requiresAdminAuthorization: true,
  });
  assert.deepEqual(loginIntent("/mypage"), {
    destination: "/admin",
    requiresAdminAuthorization: true,
  });
});

test("unsafe and looping customer returnTo values use the customer default", () => {
  for (const value of [
    "https://example.com/steal",
    "//example.com/steal",
    "/\\example.com/steal",
    "%2F%2Fexample.com/steal",
    "/%252F%252Fexample.com/steal",
    "javascript:alert(1)",
    "/%E0%A4%A",
    "/login",
    "/login?returnTo=/login",
    "/%256Cogin",
    "/signup",
    "/signup?returnTo=/signup",
    "/%2573ignup",
    "/admin",
    "/admin/customers",
    "/%2561dmin",
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
  assert.equal(safeAdminReturnTo("/admin/rest"), "/admin/rests");
  assert.equal(isAdminReturnTo("/admin/login?returnTo=/admin"), false);
  assert.equal(isAdminReturnTo("/%2561dmin/customers"), true);
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
    assert.deepEqual(loginIntent(value), {
      destination: "/admin",
      requiresAdminAuthorization: true,
    }, value);
  }
});

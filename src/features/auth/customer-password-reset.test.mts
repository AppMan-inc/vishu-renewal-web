import assert from "node:assert/strict";
import test from "node:test";
import type { Auth } from "firebase/auth";
import {
  customerPasswordResetErrorMessage,
  customerPasswordResetHref,
  passwordResetEmailValidationMessage,
  requestCustomerPasswordReset,
} from "./customer-password-reset.ts";

test("password reset link carries the entered email and safe return path", () => {
  assert.equal(customerPasswordResetHref(null, ""), "/password-reset");
  assert.equal(
    customerPasswordResetHref("/booking?step=confirm", " hanako@example.com "),
    "/password-reset?email=hanako%40example.com&returnTo=%2Fbooking%3Fstep%3Dconfirm",
  );
  assert.equal(
    customerPasswordResetHref("https://example.com", "hanako@example.com"),
    "/password-reset?email=hanako%40example.com",
  );
});

test("password reset email validation matches the app guidance", () => {
  assert.equal(passwordResetEmailValidationMessage(""), "メールアドレスを入力してください。");
  assert.equal(
    passwordResetEmailValidationMessage("invalid-email"),
    "メールアドレスの形式を確認してください。",
  );
  assert.equal(passwordResetEmailValidationMessage(" hanako@example.com "), null);
});

test("password reset requests trim the email and request a Japanese email", async () => {
  const auth = { languageCode: null } as Auth;
  let requestedEmail: string | null = null;

  await requestCustomerPasswordReset(auth, " hanako@example.com ", async (_auth, email) => {
    requestedEmail = email;
  });

  assert.equal(auth.languageCode, "ja");
  assert.equal(requestedEmail, "hanako@example.com");
});

test("unknown accounts receive the same completion flow", async () => {
  const auth = { languageCode: null } as Auth;
  await assert.doesNotReject(() =>
    requestCustomerPasswordReset(auth, "unknown@example.com", async () => {
      throw { code: "auth/user-not-found" };
    }),
  );
});

test("password reset errors use the same Japanese messages as the app", () => {
  assert.equal(
    customerPasswordResetErrorMessage({ code: "auth/network-request-failed" }),
    "通信環境を確認して、もう一度お試しください。",
  );
  assert.equal(
    customerPasswordResetErrorMessage({ code: "auth/too-many-requests" }),
    "送信回数が多すぎます。時間をおいて、もう一度お試しください。",
  );
  assert.equal(
    customerPasswordResetErrorMessage(new Error("unknown")),
    "再設定メールを送信できませんでした。時間をおいて、もう一度お試しください。",
  );
});

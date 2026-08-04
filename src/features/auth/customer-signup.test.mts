import assert from "node:assert/strict";
import test from "node:test";
import type { Auth, UserCredential } from "firebase/auth";
import {
  claimCustomerSignupSubmission,
  createCustomerAccount,
  customerLoginHref,
  customerSignupDestination,
  customerSignupErrorMessage,
  customerSignupHref,
  validateCustomerSignup,
} from "./customer-signup.ts";

test("signup entry point preserves a safe customer returnTo", () => {
  assert.equal(customerSignupHref(null), "/signup");
  assert.equal(
    customerSignupHref("/booking?step=confirm"),
    "/signup?returnTo=%2Fbooking%3Fstep%3Dconfirm",
  );
  assert.equal(
    customerLoginHref("/booking?step=confirm"),
    "/login?returnTo=%2Fbooking%3Fstep%3Dconfirm",
  );
});

test("signup validation reports all empty required fields", () => {
  assert.deepEqual(
    validateCustomerSignup({
      email: "",
      password: "",
      passwordConfirmation: "",
    }),
    {
      email: "メールアドレスを入力してください。",
      password: "パスワードを入力してください。",
      passwordConfirmation: "確認用パスワードを入力してください。",
    },
  );
});

test("signup validation rejects invalid email and short passwords", () => {
  assert.deepEqual(
    validateCustomerSignup({
      email: "not-an-email",
      password: "12345",
      passwordConfirmation: "12345",
    }),
    {
      email: "正しい形式のメールアドレスを入力してください。",
      password: "パスワードは6文字以上で入力してください。",
    },
  );
});

test("signup email accepts 50 characters and rejects 51", () => {
  const emailAtLimit = `${"a".repeat(45)}@a.co`;
  const emailOverLimit = `${"a".repeat(46)}@a.co`;

  assert.equal(
    validateCustomerSignup({
      email: emailAtLimit,
      password: "secret1",
      passwordConfirmation: "secret1",
    }).email,
    undefined,
  );
  assert.equal(
    validateCustomerSignup({
      email: emailOverLimit,
      password: "secret1",
      passwordConfirmation: "secret1",
    }).email,
    "メールアドレスは50文字以内で入力してください。",
  );
});

test("signup validation rejects a password confirmation mismatch", () => {
  assert.deepEqual(
    validateCustomerSignup({
      email: "guest@example.com",
      password: "secret1",
      passwordConfirmation: "secret2",
    }),
    { passwordConfirmation: "パスワードが一致しません。" },
  );
});

test("customer account creation trims email and uses Firebase Auth", async () => {
  const calls: Array<{ auth: Auth; email: string; password: string }> = [];
  const auth = {} as Auth;
  const credential = { user: { uid: "customer-uid" } } as UserCredential;

  const result = await createCustomerAccount(
    auth,
    { email: "  guest@example.com ", password: "secret1" },
    async (receivedAuth, email, password) => {
      calls.push({ auth: receivedAuth, email, password });
      return credential;
    },
  );

  assert.equal(result, credential);
  assert.deepEqual(calls, [
    { auth, email: "guest@example.com", password: "secret1" },
  ]);
});

test("customer account creation rejects an over-limit email before Firebase Auth", async () => {
  let called = false;
  await assert.rejects(
    createCustomerAccount(
      {} as Auth,
      { email: `${"a".repeat(46)}@a.co`, password: "secret1" },
      async () => {
        called = true;
        return {} as UserCredential;
      },
    ),
    /50文字以内/,
  );
  assert.equal(called, false);
});

test("new customer destinations can never navigate to admin", () => {
  for (const returnTo of [
    "/admin",
    "/admin/customers",
    "https://example.com/admin",
    "//example.com/admin",
  ]) {
    assert.equal(customerSignupDestination(returnTo), "/mypage", returnTo);
    assert.equal(customerSignupHref(returnTo), "/signup", returnTo);
  }
});

test("signup submission lock rejects duplicate requests and pending navigation", () => {
  const submissionInProgress = { current: false };
  const navigationStarted = { current: false };

  assert.equal(
    claimCustomerSignupSubmission(submissionInProgress, navigationStarted),
    true,
  );
  assert.equal(submissionInProgress.current, true);
  assert.equal(
    claimCustomerSignupSubmission(submissionInProgress, navigationStarted),
    false,
  );

  submissionInProgress.current = false;
  navigationStarted.current = true;
  assert.equal(
    claimCustomerSignupSubmission(submissionInProgress, navigationStarted),
    false,
  );
});

test("signup errors are translated into customer-facing Japanese", () => {
  const cases = [
    ["auth/email-already-in-use", "すでに登録"],
    ["auth/invalid-email", "メールアドレスの形式"],
    ["auth/weak-password", "6文字以上"],
    ["auth/password-does-not-meet-requirements", "セキュリティ要件"],
    ["auth/network-request-failed", "ネットワーク接続"],
    ["auth/too-many-requests", "試行回数"],
    ["auth/operation-not-allowed", "現在利用できません"],
    ["auth/internal-error", "アカウントを作成できませんでした"],
  ] as const;

  for (const [code, expectedText] of cases) {
    const message = customerSignupErrorMessage({ code });
    assert.match(message, new RegExp(expectedText), code);
    assert.doesNotMatch(message, /auth\//, code);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import type { Auth, AuthProvider, UserCredential } from "firebase/auth";
import { authenticateCustomerWithSocialProvider } from "./customer-social-auth.ts";

test("social signup uses Firebase credentials for both new and existing accounts", async () => {
  for (const method of ["google", "apple"] as const) {
    const auth = {} as Auth;
    const credential = { user: { uid: "customer-uid" } } as UserCredential;
    const result = await authenticateCustomerWithSocialProvider(auth, method, {
      popup: async (receivedAuth, provider) => {
        assert.equal(receivedAuth, auth);
        assert.equal(provider.providerId, method === "google" ? "google.com" : "apple.com");
        if (method === "apple") {
          assert.ok(provider instanceof OAuthProvider);
          assert.deepEqual(provider.getScopes(), ["email", "name"]);
        } else {
          assert.ok(provider instanceof GoogleAuthProvider);
        }
        return credential;
      },
      redirect: async () => { assert.fail("A successful popup must not redirect"); },
    });
    assert.equal(result, credential);
  }
});

test("blocked or unsupported popups fall back to redirect with the same provider", async () => {
  for (const method of ["google", "apple"] as const) {
    for (const code of ["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"]) {
      const auth = {} as Auth;
      let popupProvider: AuthProvider | undefined;
      let redirects = 0;
      const result = await authenticateCustomerWithSocialProvider(auth, method, {
        popup: async (_auth, provider) => {
          popupProvider = provider;
          throw { code };
        },
        redirect: async (receivedAuth, provider) => {
          assert.equal(receivedAuth, auth);
          assert.equal(provider, popupProvider);
          redirects += 1;
        },
      });
      assert.equal(redirects, 1);
      assert.equal(result, null);
    }
  }
});

test("cancellation and provider errors stay on signup without starting another auth flow", async () => {
  for (const code of [
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
    "auth/account-exists-with-different-credential",
    "auth/operation-not-allowed",
    "auth/network-request-failed",
  ]) {
    const error = { code };
    await assert.rejects(authenticateCustomerWithSocialProvider({} as Auth, "apple", {
      popup: async () => { throw error; },
      redirect: async () => { assert.fail("Must not redirect after cancellation or an auth error"); },
    }), (actual) => actual === error);
  }
});

test("redirect failures propagate so signup can release its submission lock", async () => {
  const error = { code: "auth/network-request-failed" };
  await assert.rejects(authenticateCustomerWithSocialProvider({} as Auth, "google", {
    popup: async () => { throw { code: "auth/popup-blocked" }; },
    redirect: async () => { throw error; },
  }), (actual) => actual === error);
});

import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";
import type { Auth, AuthProvider } from "firebase/auth";

export type CustomerSocialMethod = "google" | "apple";

type SocialAuthActions = {
  popup: typeof signInWithPopup;
  redirect: (auth: Auth, provider: AuthProvider) => Promise<void>;
};

export async function authenticateCustomerWithSocialProvider(
  auth: Auth,
  method: CustomerSocialMethod,
  actions: SocialAuthActions = {
    popup: signInWithPopup,
    redirect: signInWithRedirect,
  },
) {
  const provider = method === "google"
    ? new GoogleAuthProvider()
    : new OAuthProvider("apple.com");

  if (provider instanceof OAuthProvider) {
    provider.addScope("email");
    provider.addScope("name");
  }

  // Firebase creates a new account on first use and reuses it on later visits.
  try {
    return await actions.popup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "auth/popup-blocked"
      && code !== "auth/operation-not-supported-in-this-environment") {
      throw error;
    }
    await actions.redirect(auth, provider);
    return null;
  }
}

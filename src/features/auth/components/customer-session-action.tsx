"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { firebaseAuth } from "@/lib/firebase/client";

export function CustomerSessionAction() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      return onAuthStateChanged(
        firebaseAuth(),
        (user) => setIsAuthenticated(Boolean(user)),
        () => setIsAuthenticated(false),
      );
    } catch {
      return undefined;
    }
  }, []);

  if (!isAuthenticated) return null;

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage(null);

    try {
      await signOut(firebaseAuth());
      router.replace("/");
    } catch {
      setErrorMessage("ログアウトできませんでした。もう一度お試しください。");
      setIsSigningOut(false);
    }
  }

  return (
    <span className="header-session-action">
      <button
        className="header-session-button"
        type="button"
        disabled={isSigningOut}
        onClick={handleSignOut}
      >
        {isSigningOut ? "ログアウト中…" : "ログアウト"}
      </button>
      {errorMessage ? (
        <span className="visually-hidden" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}

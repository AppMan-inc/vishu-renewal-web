"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import { firebaseAuth } from "@/lib/firebase/client";

type CustomerAuthGuardProps = {
  children: React.ReactNode;
  returnTo: string;
};

export function CustomerAuthGuard({
  children,
  returnTo,
}: CustomerAuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        firebaseAuth(),
        (user) => {
          if (user) {
            setIsAuthenticated(true);
            return;
          }

          setIsAuthenticated(false);
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        },
        () => {
          router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
        },
      );
    } catch {
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }

    return unsubscribe;
  }, [returnTo, router]);

  if (!isAuthenticated) {
    return (
      <main className="auth-loading-page" aria-busy="true">
        <Brand />
        <div className="auth-loading-content">
          <div className="login-icon"><VishuIcon name="lock" /></div>
          <p>ログイン状態を確認しています…</p>
        </div>
      </main>
    );
  }

  return children;
}

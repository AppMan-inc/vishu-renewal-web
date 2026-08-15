import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerPasswordReset } from "@/features/auth/components/customer-password-reset";

export const metadata: Metadata = {
  title: "パスワード再設定",
  robots: { index: false, follow: false },
};

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<PasswordResetPageFallback />}>
      <CustomerPasswordReset />
    </Suspense>
  );
}

function PasswordResetPageFallback() {
  return (
    <main className="auth-loading-page" aria-busy="true">
      <p>パスワード再設定画面を読み込んでいます…</p>
    </main>
  );
}

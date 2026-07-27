import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerSignup } from "@/features/auth/components/customer-signup";

export const metadata: Metadata = {
  title: "新規アカウント作成",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <CustomerSignup />
    </Suspense>
  );
}

function SignupPageFallback() {
  return (
    <main className="auth-loading-page" aria-busy="true">
      <p>アカウント作成画面を読み込んでいます…</p>
    </main>
  );
}

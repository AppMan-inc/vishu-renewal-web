import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerLogin } from "@/features/auth/components/customer-login";

export const metadata: Metadata = {
  title: "お客様ログイン",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <CustomerLogin />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <main className="auth-loading-page" aria-busy="true">
      <p>ログイン画面を読み込んでいます…</p>
    </main>
  );
}

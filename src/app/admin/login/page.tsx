import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand, VishuIcon } from "@/components/vishu-ui";
import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

export const metadata: Metadata = {
  title: "店主ログイン",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-brand-panel">
        <div className="login-panel-decoration" aria-hidden="true">
          <VishuIcon name="leaf" />
        </div>
        <Brand owner />
        <div className="login-brand-copy">
          <p className="eyebrow">SALON MANAGEMENT</p>
          <h1>サロンの毎日を、<br />ひとつの場所で。</h1>
          <p>予約、メニュー、営業時間を、Salon Vishuらしい落ち着いた画面で管理します。</p>
        </div>
        <p className="login-panel-note">FOR SALON OWNER · PRIVATE ACCESS</p>
      </section>

      <section className="admin-login-form-panel">
        <div className="admin-login-card">
          <div className="login-icon"><VishuIcon name="lock" /></div>
          <p className="eyebrow">OWNER SIGN IN</p>
          <h2>店主ログイン</h2>
          <p className="login-guidance">登録済みのメールアドレスとパスワードを入力してください。</p>

          <Suspense fallback={<p className="login-guidance">ログイン画面を準備しています…</p>}>
            <AdminLoginForm />
          </Suspense>
          <Link className="back-link" href="/">
            <VishuIcon name="arrow" />
            公開サイトへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}

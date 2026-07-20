import type { Metadata } from "next";
import Link from "next/link";
import { Brand, VishuIcon } from "@/components/vishu-ui";

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

          <form className="login-form">
            <label htmlFor="owner-email">メールアドレス</label>
            <div className="input-wrap">
              <VishuIcon name="person" />
              <input id="owner-email" type="email" placeholder="owner@example.com" disabled />
            </div>
            <label htmlFor="owner-password">パスワード</label>
            <div className="input-wrap">
              <VishuIcon name="lock" />
              <input id="owner-password" type="password" placeholder="••••••••" disabled />
            </div>
            <button className="button button-primary" type="button" disabled>
              ログイン
              <VishuIcon name="arrow" />
            </button>
          </form>

          <div className="preview-notice login-preview-notice">
            <strong>認証機能は準備中です</strong>
            <p>Firebase Authentication接続後にログイン操作を有効化します。</p>
          </div>
          <Link className="back-link" href="/">
            <VishuIcon name="arrow" />
            公開サイトへ戻る
          </Link>
        </div>
      </section>
    </main>
  );
}

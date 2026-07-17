import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "店主ログイン",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="placeholder-page">
      <Link className="brand" href="/">
        salon vishu
      </Link>
      <section className="placeholder-shell">
        <p className="section-label">OWNER SIGN IN</p>
        <h1>店主ログイン</h1>
        <p>
          Firebase Authenticationによる管理者ログインを実装する予定です。権限は画面の表示だけでなく、サーバーとFirestoreルールの両方で確認します。
        </p>
        <div className="placeholder-grid">
          <article className="placeholder-card">
            <strong>Firebase Auth</strong>
            <p>メールアドレスとパスワードで店主を認証します。</p>
          </article>
          <article className="placeholder-card">
            <strong>Role check</strong>
            <p>owner / manager ロールと有効状態を確認します。</p>
          </article>
          <article className="placeholder-card">
            <strong>Secure session</strong>
            <p>サーバー側セッションで管理ページを保護します。</p>
          </article>
        </div>
        <Link className="button button-primary" href="/">
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}

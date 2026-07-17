import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "店主管理",
  robots: { index: false, follow: false },
};

const modules = [
  ["予約管理", "予約一覧、詳細、ステータス変更"],
  ["メニュー管理", "料金、所要時間、公開状態の編集"],
  ["営業時間・予約枠", "定休日、受付間隔、予約不可時間の設定"],
];

export default function AdminPage() {
  return (
    <main className="placeholder-page">
      <Link className="brand" href="/">
        salon vishu / owner
      </Link>
      <section className="placeholder-shell">
        <p className="section-label">OWNER CONSOLE</p>
        <h1>店主管理</h1>
        <p>
          管理機能の入口です。本実装ではFirebase Authenticationと権限チェックを通過した店主だけがアクセスできます。
        </p>
        <div className="placeholder-grid">
          {modules.map(([title, description]) => (
            <article className="placeholder-card" key={title}>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <Link className="button button-primary" href="/admin/login">
          ログイン画面へ
        </Link>
      </section>
    </main>
  );
}

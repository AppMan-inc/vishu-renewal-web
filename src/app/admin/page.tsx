import type { Metadata } from "next";
import { SiteHeader, VishuIcon } from "@/components/vishu-ui";

export const metadata: Metadata = {
  title: "店主管理",
  robots: { index: false, follow: false },
};

const modules = [
  {
    icon: "calendar" as const,
    title: "予約カレンダー",
    description: "日・週・月ごとの予約を確認",
    status: "TODAY",
  },
  {
    icon: "clock" as const,
    title: "営業時間・予約枠",
    description: "定休日や受付時間を設定",
    status: "SCHEDULE",
  },
  {
    icon: "person" as const,
    title: "顧客・カルテ",
    description: "顧客情報と施術履歴を管理",
    status: "CUSTOMERS",
  },
  {
    icon: "spa" as const,
    title: "メニュー管理",
    description: "料金・所要時間・公開状態を編集",
    status: "MENU",
  },
];

export default function AdminPage() {
  return (
    <main className="app-page admin-page">
      <SiteHeader owner />
      <section className="admin-shell">
        <div className="admin-welcome">
          <div>
            <p className="eyebrow">OWNER CONSOLE</p>
            <h1>おかえりなさい。</h1>
            <p>Salon Vishuの今日と、これからの予約を確認できます。</p>
          </div>
          <div className="admin-date">
            <span>SALON</span>
            <strong>V</strong>
            <small>VISHU</small>
          </div>
        </div>

        <div className="admin-stats" aria-label="本日の状況">
          <article>
            <span className="admin-stat-icon"><VishuIcon name="calendar" /></span>
            <div><small>本日の予約</small><strong>—<span>件</span></strong></div>
          </article>
          <article>
            <span className="admin-stat-icon"><VishuIcon name="clock" /></span>
            <div><small>次のご予約</small><strong className="text-stat">データ接続待ち</strong></div>
          </article>
          <article>
            <span className="admin-stat-icon"><VishuIcon name="sparkle" /></span>
            <div><small>今月の来店</small><strong>—<span>名</span></strong></div>
          </article>
        </div>

        <section className="admin-modules" aria-labelledby="admin-menu-title">
          <div className="admin-section-title">
            <div>
              <p className="eyebrow">MANAGEMENT</p>
              <h2 id="admin-menu-title">管理メニュー</h2>
            </div>
            <span>各機能はFirebase接続後に利用できます</span>
          </div>
          <div className="admin-module-grid">
            {modules.map((module) => (
              <article className="admin-module-card" key={module.title}>
                <span className="module-label">{module.status}</span>
                <div className="module-icon"><VishuIcon name={module.icon} /></div>
                <div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                </div>
                <span className="round-arrow"><VishuIcon name="arrow" /></span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

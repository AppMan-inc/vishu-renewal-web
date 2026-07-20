import type { Metadata } from "next";
import Link from "next/link";
import { PageFooter, SiteHeader, VishuIcon } from "@/components/vishu-ui";

export const metadata: Metadata = {
  title: "Web予約",
  description: "メニューと日時を選んでSalon Vishuを予約します。",
};

const steps = ["メニュー", "日時", "お客様情報", "確認"];

const menuTypes = [
  {
    icon: "cut" as const,
    label: "CUT",
    title: "カット",
    detail: "カウンセリングを含む、似合わせカット",
    time: "約60分",
  },
  {
    icon: "sparkle" as const,
    label: "COLOR",
    title: "カラー",
    detail: "髪の状態やご希望に合わせたカラー",
    time: "約120分〜",
  },
  {
    icon: "spa" as const,
    label: "RELAX",
    title: "ヘッドスパ",
    detail: "頭皮と髪をいたわるリラクゼーション",
    time: "約45分〜",
  },
];

export default function BookingPage() {
  return (
    <main className="app-page booking-page">
      <SiteHeader />
      <section className="app-page-shell">
        <div className="booking-title-row">
          <div>
            <p className="eyebrow">ONLINE BOOKING</p>
            <h1>Web予約</h1>
            <p>ご希望のメニューを選択してください。</p>
          </div>
          <div className="booking-support">
            <VishuIcon name="clock" />
            <span><small>受付時間</small>24時間いつでも</span>
          </div>
        </div>

        <ol className="booking-progress" aria-label="予約の進行状況">
          {steps.map((step, index) => (
            <li className={index === 0 ? "is-current" : ""} key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>

        <div className="booking-layout">
          <section className="booking-selection" aria-labelledby="booking-menu-heading">
            <div className="subsection-heading">
              <span>STEP 01</span>
              <h2 id="booking-menu-heading">メニューを選ぶ</h2>
            </div>
            <div className="booking-menu-list">
              {menuTypes.map((menu) => (
                <article className="booking-menu-card" key={menu.title}>
                  <div className="booking-menu-icon"><VishuIcon name={menu.icon} /></div>
                  <div className="booking-menu-copy">
                    <span>{menu.label}</span>
                    <h3>{menu.title}</h3>
                    <p>{menu.detail}</p>
                  </div>
                  <div className="booking-menu-meta">
                    <span><VishuIcon name="clock" />{menu.time}</span>
                    <span className="round-arrow"><VishuIcon name="arrow" /></span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="booking-summary">
            <p className="eyebrow">YOUR BOOKING</p>
            <h2>ご予約内容</h2>
            <div className="summary-empty">
              <VishuIcon name="leaf" />
              <p>メニューを選ぶと、<br />こちらに内容が表示されます。</p>
            </div>
            <div className="preview-notice">
              <strong>予約機能は準備中です</strong>
              <p>現在はアプリのデザインを反映した画面プレビューです。</p>
            </div>
            <button className="button button-primary" type="button" disabled>
              日時選択へ
              <VishuIcon name="arrow" />
            </button>
          </aside>
        </div>

        <Link className="back-link" href="/">
          <VishuIcon name="arrow" />
          トップページへ戻る
        </Link>
      </section>
      <PageFooter />
    </main>
  );
}

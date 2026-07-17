import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Web予約",
  description: "メニューと日時を選んでSalon Vishuを予約します。",
};

const steps = [
  ["01", "メニュー選択", "施術内容、料金、所要時間からメニューを選びます。"],
  ["02", "日時選択", "空いている予約枠からご希望の日時を選びます。"],
  ["03", "内容確認", "お客様情報とご要望を入力し、予約を確定します。"],
];

export default function BookingPage() {
  return (
    <main className="placeholder-page">
      <Link className="brand" href="/">
        salon vishu
      </Link>
      <section className="placeholder-shell">
        <p className="section-label">ONLINE BOOKING</p>
        <h1>Web予約</h1>
        <p>
          予約機能を実装するための入口です。Firebase接続後、メニューと空き枠を読み込み、予約確定までのフローをここに構築します。
        </p>
        <div className="placeholder-grid">
          {steps.map(([number, title, description]) => (
            <article className="placeholder-card" key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <Link className="button button-primary" href="/">
          トップへ戻る
        </Link>
      </section>
    </main>
  );
}

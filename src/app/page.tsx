import Link from "next/link";

const services = [
  {
    title: "Salon",
    description: "サロンの空気感、こだわり、アクセスをひとつの場所で伝えます。",
  },
  {
    title: "Booking",
    description: "メニューと日時を選び、そのままオンラインで予約できます。",
  },
  {
    title: "Management",
    description: "店主は予約、メニュー、営業時間を管理画面から確認できます。",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero">
        <nav className="site-nav" aria-label="メインナビゲーション">
          <Link className="brand" href="/">
            salon vishu
          </Link>
          <div className="nav-links">
            <a href="#concept">コンセプト</a>
            <a href="#service">サービス</a>
            <Link className="nav-cta" href="/booking">
              Web予約
            </Link>
          </div>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">PRIVATE HAIR SALON</p>
          <h1>
            髪と暮らしに、
            <br />
            静かな余白を。
          </h1>
          <p className="hero-copy">
            Salon Vishuのホームページと予約体験を、ひとつにつなぐための新しいWebサービスです。
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/booking">
              予約をはじめる
            </Link>
            <a className="button button-secondary" href="#concept">
              サロンについて
            </a>
          </div>
        </div>
        <p className="hero-note">VISHU RENEWAL — WEB PROJECT</p>
      </section>

      <section className="section split-section" id="concept">
        <div>
          <p className="section-label">OUR CONCEPT</p>
          <h2>予約の前から、心地よく。</h2>
        </div>
        <div className="section-copy">
          <p>
            はじめて訪れる方にもSalon Vishuらしさが伝わり、迷わず予約できること。
            店主にとっては、毎日の予約やメニューを無理なく管理できること。
          </p>
          <p>
            このプロジェクトでは、お客様向けサイトと店主管理を同じデータ基盤でつなぎます。
          </p>
        </div>
      </section>

      <section className="section service-section" id="service">
        <div className="section-heading">
          <p className="section-label">PROJECT SCOPE</p>
          <h2>ひとつのサービス、ふたつの体験。</h2>
        </div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.title}>
              <span>0{index + 1}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section booking-banner">
        <div>
          <p className="section-label">ONLINE BOOKING</p>
          <h2>ご都合のよい時間に、Webから。</h2>
        </div>
        <Link className="button button-light" href="/booking">
          予約ページを見る
        </Link>
      </section>

      <footer className="site-footer">
        <div>
          <p className="brand">salon vishu</p>
          <p>新潟のプライベートヘアサロン</p>
        </div>
        <Link href="/admin/login">店主ログイン</Link>
      </footer>
    </main>
  );
}

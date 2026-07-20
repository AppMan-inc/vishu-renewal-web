import Link from "next/link";
import {
  BotanicalArtwork,
  PageFooter,
  SiteHeader,
  VishuIcon,
} from "@/components/vishu-ui";

const values = [
  {
    icon: "person" as const,
    number: "01",
    title: "似合わせる",
    description: "髪質や骨格、いつもの過ごし方まで伺い、無理なく続くスタイルをご提案します。",
  },
  {
    icon: "spa" as const,
    number: "02",
    title: "心ほどける",
    description: "周りを気にせず過ごせる静かな空間で、髪も気持ちも軽くなる時間を。",
  },
  {
    icon: "sparkle" as const,
    number: "03",
    title: "丁寧に育てる",
    description: "その日だけでなく、次に訪れる日まで心地よさが続く丁寧な施術を大切にします。",
  },
];

const menus = [
  {
    icon: "cut" as const,
    label: "DESIGN",
    title: "Cut",
    japanese: "カット",
    description: "暮らしに馴染む、扱いやすいヘアデザイン。",
  },
  {
    icon: "sparkle" as const,
    label: "COLOR",
    title: "Color",
    japanese: "カラー",
    description: "肌の色や季節に寄り添う、やわらかな色彩。",
  },
  {
    icon: "spa" as const,
    label: "RELAX",
    title: "Head spa",
    japanese: "ヘッドスパ",
    description: "深く息をほどくような、静かなリラクゼーション。",
  },
];

export default function Home() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <SiteHeader />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-inner">
          <div className="hero-copy-block">
            <p className="eyebrow">PRIVATE HAIR SALON · NIIGATA</p>
            <h1>
              髪と心に、
              <br />
              <span>深呼吸できる時間を。</span>
            </h1>
            <p className="hero-description">
              一人ひとりの美しさを育てる、静かなプライベートサロン。
              あなたらしくいられる髪と、やわらかな余白をお届けします。
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/booking">
                Web予約をはじめる
                <VishuIcon name="arrow" />
              </Link>
              <Link className="button button-quiet" href="/#concept">
                サロンについて
              </Link>
            </div>
            <div className="hero-details" aria-label="サロンの特徴">
              <span><VishuIcon name="leaf" />完全予約制</span>
              <span><VishuIcon name="person" />プライベート空間</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <BotanicalArtwork />
            <div className="hero-visual-caption">
              <span>Nature-inspired beauty</span>
              <strong>Salon Vishu</strong>
            </div>
            <div className="hero-floating-card">
              <VishuIcon name="calendar" />
              <span><small>ONLINE BOOKING</small>24時間受付</span>
            </div>
          </div>
        </div>
        <a className="scroll-cue" href="#concept" aria-label="コンセプトまでスクロール">
          <span />
          SCROLL
        </a>
      </section>

      <section className="section concept-section" id="concept">
        <div className="section-intro">
          <div>
            <p className="eyebrow">OUR PHILOSOPHY</p>
            <h2>日常に、やわらかな<br />余白をつくる。</h2>
          </div>
          <div className="section-lead">
            <p>
              Salon Vishuが大切にするのは、髪を整えることだけではありません。
              お話をじっくり伺うこと、落ち着いて過ごせること、帰るころには心まで軽くなっていること。
            </p>
            <p>あなただけのペースに寄り添う、穏やかなサロンでありたいと考えています。</p>
          </div>
        </div>
        <div className="value-grid">
          {values.map((value) => (
            <article className="value-card" key={value.number}>
              <span className="card-number">{value.number}</span>
              <div className="icon-tile"><VishuIcon name={value.icon} /></div>
              <h3>{value.title}</h3>
              <p>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section menu-section" id="menu">
        <div className="menu-heading">
          <div>
            <p className="eyebrow">OUR MENU</p>
            <h2>あなたらしさを、<br />心地よく整える。</h2>
          </div>
          <p>
            カウンセリングから仕上げまで、ゆったりと。
            一人ひとりに必要なメニューをご案内します。
          </p>
        </div>
        <div className="menu-grid">
          {menus.map((menu, index) => (
            <article className={`menu-card menu-card-${index + 1}`} key={menu.title}>
              <div className="menu-art"><VishuIcon name={menu.icon} /></div>
              <div className="menu-card-body">
                <span>{menu.label}</span>
                <h3>{menu.title}<small>{menu.japanese}</small></h3>
                <p>{menu.description}</p>
                <Link href="/booking" aria-label={`${menu.japanese}の予約へ`}>
                  <VishuIcon name="arrow" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section experience-section">
        <div className="experience-panel">
          <div className="experience-art" aria-hidden="true">
            <div className="arch arch-back" />
            <div className="arch arch-front"><VishuIcon name="leaf" /></div>
          </div>
          <div className="experience-copy">
            <p className="eyebrow">A QUIET MOMENT</p>
            <h2>予約の前から、<br />心地よく。</h2>
            <p>
              メニューを選び、空いている時間を探し、ご予約を確認するまで。
              Salon Vishuらしい、落ち着いた体験をWebでもお届けします。
            </p>
            <ul>
              <li><VishuIcon name="calendar" />いつでもオンライン予約</li>
              <li><VishuIcon name="clock" />空き時間をかんたん確認</li>
              <li><VishuIcon name="leaf" />迷わないシンプルな予約導線</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="booking-callout">
        <div>
          <p className="eyebrow">ONLINE BOOKING</p>
          <h2>次の心地よい時間を、<br />ここから。</h2>
        </div>
        <Link className="button button-light" href="/booking">
          Web予約をはじめる
          <VishuIcon name="arrow" />
        </Link>
      </section>

      <PageFooter />
    </main>
  );
}

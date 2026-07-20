import Link from "next/link";
import {
  BotanicalArtwork,
  PageFooter,
  SiteHeader,
  VishuIcon,
} from "@/components/vishu-ui";

const hotPepperUrl = "https://beauty.hotpepper.jp/slnH000583006/";

const salonJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "Salon Vishu",
  alternateName: "サロンヴィッシュ",
  description:
    "大阪府河内長野市荘園町の、1席・スタイリスト1名の完全予約制プライベートヘアサロン。",
  telephone: "+81-721-21-8824",
  address: {
    "@type": "PostalAddress",
    addressRegion: "大阪府",
    addressLocality: "河内長野市",
    streetAddress: "荘園町18-14",
    addressCountry: "JP",
  },
  priceRange: "¥¥",
  sameAs: [hotPepperUrl],
};

const values = [
  {
    icon: "person" as const,
    number: "01",
    title: "一席だけの空間",
    description: "セット面は1席。ほかのお客様を気にせず過ごせる、完全予約制のプライベートサロンです。",
  },
  {
    icon: "spa" as const,
    number: "02",
    title: "髪と頭皮にやさしく",
    description: "ハーブカラーやコスメパーマ、髪質改善を取り入れ、ダメージに配慮した施術をご提案します。",
  },
  {
    icon: "sparkle" as const,
    number: "03",
    title: "癒やしのヘッドスパ",
    description: "首に負担がかかりにくいシャンプー台と、こだわりのCOTAヘアケアで心地よいひとときを。",
  },
];

const menus = [
  {
    icon: "cut" as const,
    label: "CUT",
    title: "Cut",
    japanese: "カット",
    description: "大人カット（シャンプー・ブロー込み）",
    price: "¥3,800",
  },
  {
    icon: "sparkle" as const,
    label: "HERB COLOR",
    title: "Herb color",
    japanese: "ハーブカラー",
    description: "おしゃれ染めにも白髪染めにも。髪へのやさしさに配慮したカラー。",
    price: "¥7,000〜",
  },
  {
    icon: "sparkle" as const,
    label: "HAIR STRAIGHTENING",
    title: "Acid straight",
    japanese: "酸性縮毛矯正",
    description: "カット・システムトリートメント込みの髪質改善メニュー。",
    price: "¥19,000〜",
  },
];

const salonDetails = [
  { label: "営業時間", value: "9:00〜18:00（カット最終受付 17:00）" },
  { label: "定休日", value: "不定休（お問い合わせください）" },
  { label: "サロン", value: "セット面1席・スタイリスト1名・完全予約制・禁煙" },
  { label: "駐車場", value: "店舗前に砂利駐車場あり" },
  { label: "お支払い", value: "Visa / Mastercard / JCB / American Express / PayPay" },
];

export default function Home() {
  return (
    <main className="home-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(salonJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="home-hero">
        <SiteHeader />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-inner">
          <div className="hero-copy-block">
            <p className="eyebrow">PRIVATE HAIR SALON · KAWACHINAGANO</p>
            <h1>
              髪と心に、
              <br />
              <span>深呼吸できる時間を。</span>
            </h1>
            <p className="hero-description">
              大阪府河内長野市荘園町にある、一席だけのプライベートサロン。
              髪にやさしい施術と、ゆっくり過ごせる時間をお届けします。
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
              <span><VishuIcon name="person" />セット面1席</span>
              <span><VishuIcon name="pin" />大阪・河内長野</span>
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
              ハーブカラーや髪質改善、トリートメントを取り入れ、髪への負担に配慮した施術を行っています。
            </p>
            <p>最初から仕上げまで一人のスタイリストが担当。あなただけのペースでお過ごしください。</p>
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
                <strong className="menu-price">{menu.price}</strong>
                <Link href="/booking" aria-label={`${menu.japanese}の予約へ`}>
                  <VishuIcon name="arrow" />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="menu-note">
          価格は税込です。カラー・パーマ・縮毛矯正などは長さにより ¥550〜¥2,200 の追加料金があります。
        </p>
      </section>

      <section className="section access-section" id="access">
        <div className="access-heading">
          <div>
            <p className="eyebrow">SALON INFORMATION</p>
            <h2>サロン情報</h2>
          </div>
          <a
            className="source-link"
            href={hotPepperUrl}
            target="_blank"
            rel="noreferrer"
          >
            HOT PEPPER Beautyで最新情報を見る
            <VishuIcon name="arrow" />
          </a>
        </div>
        <div className="access-layout">
          <div className="access-card access-address-card">
            <div className="access-icon"><VishuIcon name="pin" /></div>
            <p className="access-label">ADDRESS</p>
            <h3>大阪府河内長野市<br />荘園町18-14</h3>
            <p>南海高野線 千代田駅から荘園町行きバスで15分、荘園町下車徒歩3分。</p>
            <a
              className="button button-quiet"
              href="https://www.google.com/maps/search/?api=1&query=%E5%A4%A7%E9%98%AA%E5%BA%9C%E6%B2%B3%E5%86%85%E9%95%B7%E9%87%8E%E5%B8%82%E8%8D%98%E5%9C%92%E7%94%BA18-14"
              target="_blank"
              rel="noreferrer"
            >
              地図を開く
              <VishuIcon name="arrow" />
            </a>
          </div>
          <div className="access-detail-card">
            <dl>
              {salonDetails.map((detail) => (
                <div key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
            <div className="access-contact">
              <div>
                <span>ご予約・お問い合わせ</span>
                <a href="tel:0721218824">0721-21-8824</a>
              </div>
              <VishuIcon name="phone" />
            </div>
          </div>
        </div>
        <div className="access-note">
          <strong>お車でお越しの方へ</strong>
          <p>
            カーナビが案内する農道は危険なため通らず、赤峰交差点・小山田小学校前を通るルートでお越しください。
          </p>
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

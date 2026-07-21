import Link from "next/link";
import { PageFooter, SiteHeader, VishuIcon } from "@/components/vishu-ui";

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

const quickMenus = [
  { label: "カット", icon: "cut" as const },
  { label: "カラー", icon: "sparkle" as const },
  { label: "髪質改善", icon: "spa" as const },
  { label: "ヘッドスパ", icon: "person" as const },
];

const featuredMenus = [
  {
    number: "01",
    name: "似合わせカット",
    caption: "CUT & STYLING",
    description: "骨格や髪の流れを見ながら、毎朝扱いやすいシルエットへ。",
    price: "¥3,800",
    time: "60 min",
    tone: "peach",
  },
  {
    number: "02",
    name: "ハーブカラー",
    caption: "HERB COLOR",
    description: "おしゃれ染めから白髪染めまで。やわらかな色と艶を引き出します。",
    price: "¥7,000〜",
    time: "120 min",
    tone: "rose",
  },
  {
    number: "03",
    name: "酸性縮毛矯正",
    caption: "HAIR STRAIGHTENING",
    description: "自然に動く、するんとした髪へ。カット・ケア込みの髪質改善。",
    price: "¥19,000〜",
    time: "210 min",
    tone: "mauve",
  },
];

const salonDetails = [
  { label: "OPEN", value: "9:00 — 18:00" },
  { label: "CLOSED", value: "不定休" },
  { label: "ADDRESS", value: "大阪府河内長野市荘園町18-14" },
  { label: "PARKING", value: "店舗前に専用駐車場あり" },
];

function HairPortrait() {
  return (
    <svg
      className="salon-hair-portrait"
      viewBox="0 0 560 700"
      role="img"
      aria-label="鏡の前で髪を整える様子を表現したイラスト"
    >
      <defs>
        <linearGradient id="hair-background" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e5b6aa" />
          <stop offset="1" stopColor="#b85f68" />
        </linearGradient>
        <linearGradient id="hair-shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2d2325" />
          <stop offset=".55" stopColor="#493235" />
          <stop offset="1" stopColor="#211b1c" />
        </linearGradient>
        <clipPath id="portrait-arch">
          <path d="M44 654V258C44 122 150 32 280 32s236 90 236 226v396H44Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#portrait-arch)">
        <rect width="560" height="700" fill="url(#hair-background)" />
        <circle cx="458" cy="130" r="190" fill="#f1d4cc" opacity=".34" />
        <path d="M-40 590c112-73 199-89 262-49 69 44 139 41 378-53v240H-40V590Z" fill="#f5e5df" opacity=".45" />
        <path d="M180 678c1-129 20-232 58-309h88c37 76 57 179 59 309H180Z" fill="#f4e4df" />
        <path d="M248 323h68v84c-3 26-63 27-68 0v-84Z" fill="#d9a293" />
        <ellipse cx="282" cy="251" rx="101" ry="128" fill="#e9b5a4" />
        <path d="M181 258c-7-116 33-177 111-177 88 0 129 70 108 198-9 53-32 104-66 152l-24-108c30-32 44-71 39-116-42 24-96 30-161 17l24 196c-45-53-55-107-31-162Z" fill="url(#hair-shine)" />
        <path d="M187 193c51 21 106 17 164-12" fill="none" stroke="#8e6264" strokeWidth="8" strokeLinecap="round" opacity=".5" />
        <path d="M212 211c-3 89 8 163 31 221M346 200c7 86-5 164-35 235" fill="none" stroke="#67484c" strokeWidth="5" strokeLinecap="round" opacity=".8" />
        <path d="M240 268c10 6 20 7 30 1M300 269c10 5 20 4 29-2" fill="none" stroke="#65484a" strokeWidth="4" strokeLinecap="round" />
        <path d="M268 316c11 7 22 7 33-1" fill="none" stroke="#a45e61" strokeWidth="4" strokeLinecap="round" />
        <path d="M115 620c35-84 84-135 146-155M445 620c-30-85-75-136-137-158" fill="none" stroke="#2e2426" strokeWidth="18" strokeLinecap="round" />
      </g>
      <path d="M44 654V258C44 122 150 32 280 32s236 90 236 226v396" fill="none" stroke="#fff9f5" strokeWidth="9" opacity=".8" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="salon-home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(salonJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="salon-hero">
        <SiteHeader />
        <div className="salon-hero-inner">
          <div className="salon-hero-copy">
            <p className="salon-kicker"><span /> ONE SEAT, JUST FOR YOU</p>
            <h1>
              今日より少し、
              <br />
              <em>好きな髪</em>でいよう。
            </h1>
            <p className="salon-hero-description">
              大阪・河内長野の一席だけのヘアサロン。
              似合うスタイルを一緒に見つけ、最初から仕上げまで一人のスタイリストが担当します。
            </p>
            <div className="salon-hero-actions">
              <Link className="salon-primary-action" href="/booking">
                空き時間を見て予約
                <span><VishuIcon name="arrow" /></span>
              </Link>
              <a className="salon-text-action" href="#style-menu">
                メニュー・料金を見る
              </a>
            </div>
            <dl className="salon-hero-facts">
              <div><dt>STYLE</dt><dd>マンツーマン</dd></div>
              <div><dt>SPACE</dt><dd>完全プライベート</dd></div>
              <div><dt>AREA</dt><dd>大阪・河内長野</dd></div>
            </dl>
          </div>

          <div className="salon-hero-visual">
            <div className="salon-portrait-frame"><HairPortrait /></div>
            <div className="salon-visual-word" aria-hidden="true">HAIR<br />DESIGN</div>
            <div className="salon-availability-card">
              <div>
                <span className="salon-live-dot" />
                <small>ONLINE BOOKING</small>
              </div>
              <strong>ご予約は24時間受付中</strong>
              <Link href="/booking">空き状況を見る <VishuIcon name="arrow" /></Link>
            </div>
            <div className="salon-round-note">PRIVATE<br />HAIR SALON</div>
          </div>
        </div>
        <a className="salon-scroll" href="#quick-booking" aria-label="予約メニューへ移動">
          <span /> SCROLL TO DISCOVER
        </a>
      </section>

      <section className="salon-quick-booking" id="quick-booking">
        <div className="salon-quick-copy">
          <span className="salon-step-number">01</span>
          <div>
            <p className="salon-section-label">FIND YOUR MENU</p>
            <h2>何を予約しますか？</h2>
          </div>
        </div>
        <div className="salon-quick-grid">
          {quickMenus.map((menu) => (
            <Link href="/booking" className="salon-quick-item" key={menu.label}>
              <span><VishuIcon name={menu.icon} /></span>
              <strong>{menu.label}</strong>
              <VishuIcon name="arrow" />
            </Link>
          ))}
        </div>
        <Link className="salon-all-menu-link" href="/booking">
          すべてのメニューから選ぶ <VishuIcon name="arrow" />
        </Link>
      </section>

      <section className="salon-concept" id="concept">
        <div className="salon-concept-heading">
          <p className="salon-section-label">ABOUT VISHU</p>
          <h2>あなただけに向き合える、<br />一席だけの美容室。</h2>
        </div>
        <div className="salon-concept-story">
          <p className="salon-concept-lead">
            大型サロンが少し苦手な方にも、<br />肩の力を抜いて過ごしてほしいから。
          </p>
          <p>
            Salon Vishuは、セット面ひとつ、スタイリストひとりの完全予約制サロンです。
            周りを気にせず髪の悩みを話せること、担当が途中で変わらないこと、次の予定まで急かされないこと。
            そのすべてを、心地よい仕上がりのために大切にしています。
          </p>
          <div className="salon-concept-points">
            <div><span>01</span><strong>一対一の<br />カウンセリング</strong></div>
            <div><span>02</span><strong>髪への負担に<br />配慮した薬剤</strong></div>
            <div><span>03</span><strong>静かに過ごせる<br />貸切空間</strong></div>
          </div>
        </div>
      </section>

      <section className="salon-menu-showcase" id="style-menu">
        <div className="salon-section-heading">
          <div>
            <p className="salon-section-label">POPULAR MENU</p>
            <h2>髪の今に合わせて選ぶ。</h2>
          </div>
          <p>料金と所要時間がひと目でわかる、人気のメニュー。</p>
        </div>
        <div className="salon-menu-grid">
          {featuredMenus.map((menu) => (
            <article className={`salon-menu-card is-${menu.tone}`} key={menu.number}>
              <div className="salon-menu-art" aria-hidden="true">
                <span>{menu.number}</span>
                <div className="salon-hair-lines"><i /><i /><i /><i /></div>
                <small>{menu.caption}</small>
              </div>
              <div className="salon-menu-body">
                <h3>{menu.name}</h3>
                <p>{menu.description}</p>
                <div>
                  <span><VishuIcon name="clock" />{menu.time}</span>
                  <strong>{menu.price}</strong>
                  <Link href="/booking" aria-label={`${menu.name}を予約`}><VishuIcon name="arrow" /></Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="salon-price-note">
          ※ 価格は税込です。髪の長さや状態により追加料金・施術時間が変わる場合があります。
        </p>
      </section>

      <section className="salon-booking-guide">
        <div className="salon-guide-intro">
          <p className="salon-section-label">EASY BOOKING</p>
          <h2>思い立ったとき、<br />3分で予約。</h2>
          <p>電話をかける時間がなくても、空いている日時からそのままご予約いただけます。</p>
          <Link className="salon-light-action" href="/booking">予約をはじめる <VishuIcon name="arrow" /></Link>
        </div>
        <ol className="salon-guide-steps">
          <li><span>01</span><div><VishuIcon name="cut" /><strong>メニューを選ぶ</strong><p>料金と所要時間を確認</p></div></li>
          <li><span>02</span><div><VishuIcon name="calendar" /><strong>空いている日時を選ぶ</strong><p>7日分の空き枠を表示</p></div></li>
          <li><span>03</span><div><VishuIcon name="person" /><strong>連絡先を入力して完了</strong><p>ご要望も事前に伝えられます</p></div></li>
        </ol>
      </section>

      <section className="salon-info" id="access">
        <div className="salon-info-main">
          <p className="salon-section-label">SALON INFORMATION</p>
          <h2>はじめての方へ。</h2>
          <p className="salon-info-message">
            髪型が決まっていなくても大丈夫です。<br />今のお悩みや、普段の過ごし方から一緒に考えます。
          </p>
          <a href={hotPepperUrl} target="_blank" rel="noreferrer" className="salon-outline-link">
            最新情報を確認する <VishuIcon name="arrow" />
          </a>
        </div>
        <div className="salon-info-details">
          <dl>
            {salonDetails.map((detail) => (
              <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
            ))}
          </dl>
          <div className="salon-contact-row">
            <span><VishuIcon name="phone" /> ご予約・お問い合わせ</span>
            <a href="tel:0721218824">0721-21-8824</a>
          </div>
        </div>
      </section>

      <section className="salon-final-cta">
        <div className="salon-final-mark" aria-hidden="true">V</div>
        <div>
          <p className="salon-section-label">SEE YOU AT VISHU</p>
          <h2>次のヘアスタイルを、<br />ここから予約。</h2>
        </div>
        <Link className="salon-primary-action is-light" href="/booking">
          空き時間を見て予約 <span><VishuIcon name="arrow" /></span>
        </Link>
      </section>

      <PageFooter />
      <nav className="salon-mobile-booking" aria-label="モバイル予約ナビゲーション">
        <a href="tel:0721218824"><VishuIcon name="phone" />電話する</a>
        <Link href="/booking"><VishuIcon name="calendar" />Web予約</Link>
      </nav>
    </main>
  );
}

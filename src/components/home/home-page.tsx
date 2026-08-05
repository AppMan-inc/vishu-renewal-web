import Image from "next/image";
import Link from "next/link";
import { PageFooter, SiteHeader, VishuIcon } from "@/components/vishu-ui";
import { CustomerLogoutButton } from "@/features/auth/components/customer-session-provider";
import { siteAssetPath } from "@/lib/site-path";
import styles from "./home-page.module.css";

const hotPepperUrl = "https://beauty.hotpepper.jp/slnH000583006/";
const googleMapsUrl =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Salon Vishu 大阪府河内長野市荘園町18-14");
const googleMapsEmbedUrl =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("Salon Vishu 大阪府河内長野市荘園町18-14") +
  "&output=embed";

const services = [
  {
    index: "01",
    name: "似合わせカット",
    english: "CUT & STYLING",
    description: "骨格や髪の流れを見ながら、毎朝扱いやすいシルエットへ。",
    price: "¥3,800",
    duration: "60 min",
  },
  {
    index: "02",
    name: "ハーブカラー",
    english: "HERB COLOR",
    description: "おしゃれ染めから白髪染めまで。やわらかな色と艶を引き出します。",
    price: "¥7,000〜",
    duration: "120 min",
  },
  {
    index: "03",
    name: "酸性縮毛矯正",
    english: "HAIR STRAIGHTENING",
    description: "自然に動く、するんとした髪へ。カット・ケア込みの髪質改善。",
    price: "¥19,000〜",
    duration: "210 min",
  },
] as const;

const salonDetails = [
  ["OPEN", "9:00 — 18:00"],
  ["CLOSED", "不定休"],
  ["ADDRESS", "大阪府河内長野市荘園町18-14"],
  ["PARKING", "店舗前に専用駐車場あり"],
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={styles.sectionLabel}>{children}</p>;
}

function ArrowLink({
  children,
  href,
  light = false,
}: {
  children: React.ReactNode;
  href: string;
  light?: boolean;
}) {
  return (
    <Link className={`${styles.arrowLink}${light ? ` ${styles.arrowLinkLight}` : ""}`} href={href}>
      <span>{children}</span>
      <VishuIcon name="arrow" />
    </Link>
  );
}

function HeroSection() {
  return (
    <section className={styles.hero} aria-labelledby="home-hero-title">
      <div className={styles.heroCopy}>
        <SectionLabel>FIND YOUR BEAUTY</SectionLabel>
        <p className={styles.heroBrand}>Salon Vishu</p>
        <h1 id="home-hero-title">
          <span className={styles.headlineLine}>上質なヘアデザインを、</span>
          <em className={styles.headlineLine}>もっと心地よく。</em>
        </h1>
        <p className={styles.heroDescription}>
          大阪・河内長野の、一席だけのプライベートサロン。
          <br />
          髪と心に寄り添う時間を、最初から仕上げまで丁寧に。
        </p>
        <div className={styles.heroActions}>
          <ArrowLink href="/booking">空き時間を見て予約</ArrowLink>
          <a className={styles.textLink} href="#style-menu">メニュー・料金を見る</a>
        </div>
        <dl className={styles.heroFacts}>
          <div><dt>STYLE</dt><dd>マンツーマン</dd></div>
          <div><dt>SPACE</dt><dd>完全プライベート</dd></div>
          <div><dt>AREA</dt><dd>大阪・河内長野</dd></div>
        </dl>
      </div>

      <div className={styles.heroVisual}>
        <Image
          alt="自然光の中で、艶のあるヘアスタイルを見せる女性"
          className={styles.heroImage}
          fill
          preload
          sizes="(max-width: 760px) 100vw, 54vw"
          src={siteAssetPath("/images/salon-vishu-hero.jpg")}
        />
        <div className={styles.heroImageShade} />
        <p className={styles.heroImageNote}>HAIR &amp; RELAXATION</p>
        <div className={styles.heroBookingNote}>
          <span><i /> ONLINE BOOKING</span>
          <strong>24時間、いつでもご予約</strong>
          <Link href="/booking">空き状況を見る <VishuIcon name="arrow" /></Link>
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section className={styles.philosophy} id="concept" aria-labelledby="philosophy-title">
      <div className={styles.philosophyImageWrap}>
        <Image
          alt="一人のお客様の髪に丁寧に触れるスタイリスト"
          className={styles.philosophyImage}
          height={1024}
          sizes="(max-width: 760px) 100vw, 56vw"
          src={siteAssetPath("/images/salon-vishu-care.jpg")}
          width={1536}
        />
        <div className={styles.imageCaption}>
          <span>01</span>
          <p>ONE SEAT<br />JUST FOR YOU</p>
        </div>
      </div>
      <div className={styles.philosophyCopy}>
        <SectionLabel>OUR PHILOSOPHY</SectionLabel>
        <h2 id="philosophy-title">日常に、やわらかな<br />余白をつくる。</h2>
        <p className={styles.lead}>あなただけに向き合える、一席だけの美容室。</p>
        <p>
          髪質や骨格だけでなく、毎日の過ごし方まで丁寧に伺います。
          周りを気にせず相談できること、担当が途中で変わらないこと、
          肩の力を抜いて過ごせること。そのすべてを、心地よい仕上がりのために。
        </p>
        <ul className={styles.valueList}>
          <li><VishuIcon name="person" /><span><strong>似合わせ提案</strong>一対一のカウンセリング</span></li>
          <li><VishuIcon name="spa" /><span><strong>静かな空間</strong>一席だけの貸切サロン</span></li>
          <li><VishuIcon name="sparkle" /><span><strong>丁寧な施術</strong>髪への負担にも配慮</span></li>
        </ul>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section className={styles.services} id="style-menu" aria-labelledby="services-title">
      <div className={styles.sectionHeading}>
        <div>
          <SectionLabel>SELECTED MENU</SectionLabel>
          <h2 id="services-title">髪の今に合わせて選ぶ。</h2>
        </div>
        <p>料金と所要時間を確認して、空いている日時からスムーズにご予約いただけます。</p>
      </div>
      <div className={styles.serviceList}>
        {services.map((service) => (
          <article className={styles.serviceCard} key={service.index}>
            <div className={styles.serviceIndex}>{service.index}</div>
            <div className={styles.serviceTitle}>
              <span>{service.english}</span>
              <h3>{service.name}</h3>
            </div>
            <p>{service.description}</p>
            <div className={styles.serviceMeta}>
              <span><VishuIcon name="clock" />{service.duration}</span>
              <strong>{service.price}</strong>
            </div>
            <Link className={styles.serviceArrow} href="/booking" aria-label={`${service.name}を予約する`}>
              <VishuIcon name="arrow" />
            </Link>
          </article>
        ))}
      </div>
      <div className={styles.servicesFooter}>
        <p>※ 価格は税込です。髪の長さや状態により追加料金・施術時間が変わる場合があります。</p>
        <ArrowLink href="/booking">すべてのメニューを見る</ArrowLink>
      </div>
    </section>
  );
}

function BookingGuideSection() {
  const steps = [
    ["01", "メニューを選ぶ", "料金と所要時間を確認"],
    ["02", "空いている日時を選ぶ", "7日分の空き枠を表示"],
    ["03", "連絡先を入力する", "ご要望も事前に伝えられます"],
    ["04", "内容を確認して予約確定", "入力内容を確認して予約を送信"],
  ] as const;

  return (
    <section className={styles.guide} aria-labelledby="guide-title">
      <div className={styles.guideCopy}>
        <SectionLabel>EASY BOOKING</SectionLabel>
        <h2 id="guide-title">思い立ったとき、<br />3分で予約。</h2>
        <p>電話をかける時間がなくても、空いている日時からそのままご予約いただけます。</p>
        <ArrowLink href="/booking" light>予約をはじめる</ArrowLink>
      </div>
      <ol className={styles.guideSteps}>
        {steps.map(([index, title, detail]) => (
          <li key={index}>
            <span>{index}</span>
            <div><strong>{title}</strong><p>{detail}</p></div>
            <VishuIcon name="arrow" />
          </li>
        ))}
      </ol>
    </section>
  );
}

function SalonInfoSection() {
  return (
    <section className={styles.info} id="access" aria-labelledby="info-title">
      <div className={styles.infoIntro}>
        <SectionLabel>SALON INFORMATION</SectionLabel>
        <h2 id="info-title">はじめての方へ。</h2>
        <p>髪型が決まっていなくても大丈夫です。<br />今のお悩みや普段の過ごし方から、一緒に考えます。</p>
        <a className={styles.outlineLink} href={hotPepperUrl} target="_blank" rel="noreferrer">
          最新情報を確認する <VishuIcon name="arrow" />
        </a>
      </div>
      <div className={styles.infoDetails}>
        <dl>
          {salonDetails.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <div className={styles.contact}>
          <span><VishuIcon name="phone" /> ご予約・お問い合わせ</span>
          <a href="tel:0721218824">0721-21-8824</a>
        </div>
        <div className={styles.mapBlock}>
          <div className={styles.mapHeading}>
            <div>
              <span>ACCESS MAP</span>
              <p>大阪府河内長野市荘園町18-14</p>
            </div>
            <a href={googleMapsUrl} target="_blank" rel="noreferrer">
              Google マップで見る <VishuIcon name="arrow" />
            </a>
          </div>
          <iframe
            className={styles.mapFrame}
            src={googleMapsEmbedUrl}
            title="Salon Vishu 周辺地図"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

function FinalReservation() {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <p className={styles.finalMark} aria-hidden="true">V</p>
      <div>
        <SectionLabel>SEE YOU AT VISHU</SectionLabel>
        <h2 id="final-cta-title">あなたらしい美しさを、<br />Salon Vishuで。</h2>
      </div>
      <ArrowLink href="/booking" light>空き時間を見て予約</ArrowLink>
    </section>
  );
}

export function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.headerWrap}><SiteHeader /></div>
      <HeroSection />
      <PhilosophySection />
      <ServicesSection />
      <BookingGuideSection />
      <SalonInfoSection />
      <FinalReservation />
      <PageFooter />
      <div className={styles.customerMobileLogoutSlot}>
        <CustomerLogoutButton variant="mobile" />
      </div>
      <nav className={styles.mobileBooking} aria-label="モバイル予約ナビゲーション">
        <a href="tel:0721218824"><VishuIcon name="phone" />電話する</a>
        <Link href="/booking"><VishuIcon name="calendar" />Web予約</Link>
      </nav>
    </main>
  );
}

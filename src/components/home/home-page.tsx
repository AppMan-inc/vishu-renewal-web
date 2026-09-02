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

const drivingDirections = {
  route170:
    "170号線を河内長野警察方面へ曲がり直進赤峰交差点小山田小学校前直進荘園橋を渡り酒屋を越えて一つ目の筋を右へ道なりに十字路３つ越えてY字路左にカーブした角すぐの白と黒の建物です。",
  route310:
    "310号線からの場合千代田駅をスーパー西友方面へ曲がり寺ヶ池方面へ赤峰交差点右に小山田小学前を通り荘園橋を渡り酒屋を越えて一つ目の筋を右へ道なりに十字路３つ越えてY字路左にカーブした角すぐの白と黒の建物です。",
  warning:
    "ナビゲーションが案内する農道は危険なので通らないで下さい。赤峰交差点、小山田小学校前を通ってお越し下さい。お願い致します。",
} as const;

const services = [
  {
    index: "01",
    name: "カット",
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
    name: "髪質改善★酸性縮毛矯正",
    english: "HAIR STRAIGHTENING",
    description: "自然に動く、するんとした髪へ。カット・ケア込みの髪質改善。",
    price: "¥19,000〜",
    duration: "210 min",
  },
] as const;

const straighteningPairs = [
  {
    before: "/images/salon-vishu-straightening-before-01.webp",
    after: "/images/salon-vishu-straightening-after-01.webp",
  },
  {
    before: "/images/salon-vishu-straightening-before-02.webp",
    after: "/images/salon-vishu-straightening-after-02.webp",
  },
] as const;

const salonDetails = [
  ["OPEN", "9:00 — 18:00"],
  ["CLOSED", "不定休"],
  ["ADDRESS", "大阪府河内長野市荘園町18-14"],
  ["PARKING", "店前砂利駐車場"],
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
        <p className={styles.heroBrand}>
          Salon Vishu
          <span>サロン ヴィッシュ</span>
        </p>
        <h1 id="home-hero-title">
          <span className={styles.headlineLine}>河内長野市荘園町の</span>
          <em className={styles.headlineLine}>完全予約制プライベートサロン</em>
        </h1>
        <p className={styles.heroDescription}>
          Salon Vishuは、大阪府河内長野市荘園町にある一席だけの美容室です。ほかのお客様を気にせず過ごせる、完全予約制のプライベートサロンとして営業しています。ハーブカラー、縮毛矯正、髪質改善、ヘッドスパなどをご提供しています。
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
          alt="Salon Vishuの明るく落ち着いた店内"
          className={styles.heroImage}
          fill
          preload
          sizes="(max-width: 767px) 100vw, (max-width: 1099px) 760px, 50vw"
          src={siteAssetPath("/images/salon-vishu-interior.webp")}
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

function ShampooSection() {
  return (
    <section className={styles.shampoo} aria-labelledby="shampoo-title">
      <div className={styles.shampooImageWrap}>
        <Image
          alt="首をやさしく支えるクッションを備えたSalon Vishuのシャンプー台"
          className={styles.shampooImage}
          height={941}
          sizes="(max-width: 680px) calc(100vw - 36px), (max-width: 820px) calc(100vw - 64px), 56vw"
          src={siteAssetPath("/images/salon-vishu-shampoo-station.webp")}
          width={1672}
        />
      </div>
      <div className={styles.shampooCopy}>
        <SectionLabel>RELAXING SHAMPOO</SectionLabel>
        <h2 id="shampoo-title">首にやさしい、<br />くつろぎのシャンプー台。</h2>
        <p>☆シャンプー台は首に負担がかからないのでヘッドスパが人気です☆是非体験を★</p>
      </div>
    </section>
  );
}

function StraighteningSection() {
  return (
    <section className={styles.straightening} id="straightening" aria-labelledby="straightening-title">
      <div className={styles.straighteningInner}>
        <div className={styles.straighteningCopy}>
          <h2 className={styles.straighteningTitle} id="straightening-title">
            髪質改善・縮毛矯正<br />自然に、美しく。
          </h2>
          <p className={styles.straighteningSubCopy}>Salon Vishuが力を入れている髪質改善・縮毛矯正では、髪の状態を丁寧に見極めながら、髪本来の美しさを活かした自然なストレートに仕上げます。</p>
        </div>
        <div className={styles.straighteningPairs}>
          {straighteningPairs.map((pair, index) => (
            <div
              className={styles.straighteningPair}
              id={`straightening-pair-${index + 1}`}
              key={pair.before}
            >
              <figure>
                <figcaption>Before</figcaption>
                <Image
                  alt={`髪質改善・縮毛矯正${index + 1}組目の施術前`}
                  className={styles.straighteningImage}
                  height={2134}
                  sizes="(max-width: 680px) 43vw, (max-width: 1120px) 344px, 300px"
                  src={siteAssetPath(pair.before)}
                  width={1600}
                />
              </figure>
              <figure>
                <figcaption>After</figcaption>
                <Image
                  alt={`髪質改善・縮毛矯正${index + 1}組目の施術後`}
                  className={styles.straighteningImage}
                  height={2134}
                  sizes="(max-width: 680px) 43vw, (max-width: 1120px) 344px, 300px"
                  src={siteAssetPath(pair.after)}
                  width={1600}
                />
              </figure>
              <span className={styles.straighteningArrow} aria-hidden="true">
                <VishuIcon name="arrow" />
              </span>
            </div>
          ))}
        </div>
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
          <h2 id="services-title">メニュー</h2>
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
        <h2 id="guide-title">予約をはじめる</h2>
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
        <div className={styles.mapMedia}>
          <div className={styles.mapImageWrap}>
            <Image
              alt="Salon Vishuの木製の玄関ドア"
              className={styles.mapImage}
              fill
              sizes="(max-width: 680px) calc(100vw - 36px), (max-width: 820px) calc(100vw - 64px), 38vw"
              src={siteAssetPath("/images/salon-vishu-exterior.webp")}
            />
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
        <div className={styles.drivingGuide}>
          <div className={styles.drivingGuideHeading}>
            <span>DRIVING DIRECTIONS</span>
            <h3>お車でお越しの方へ</h3>
          </div>
          <div className={styles.drivingRoutes}>
            <p><strong>170号線から</strong>{drivingDirections.route170}</p>
            <p><strong>310号線から</strong>{drivingDirections.route310}</p>
          </div>
          <aside className={styles.drivingWarning}>
            <strong>農道は危険です</strong>
            <p>{drivingDirections.warning}</p>
          </aside>
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
        <SectionLabel>SEE YOU AT Salon Vishu</SectionLabel>
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
      <StraighteningSection />
      <ShampooSection />
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

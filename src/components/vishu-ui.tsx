import Link from "next/link";
import { CustomerSessionAction } from "@/features/auth/components/customer-session-action";

type IconName =
  | "arrow"
  | "calendar"
  | "clock"
  | "cut"
  | "leaf"
  | "lock"
  | "phone"
  | "pin"
  | "person"
  | "sparkle"
  | "spa";

const iconPaths: Record<IconName, React.ReactNode> = {
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4m8-4v4M3 10h18m-13 4h.01m4-.01V14m4-.01V14M8 18h.01m4-.01V18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  cut: (
    <>
      <circle cx="6" cy="7" r="3" />
      <circle cx="6" cy="17" r="3" />
      <path d="m8.6 8.5 11.4 7M8.6 15.5 20 8M12 12l-3.4 2.1" />
    </>
  ),
  leaf: <path d="M19.5 3.5C12 3.8 6.2 7.1 4.8 12.4c-1 3.8 1.3 6.8 4.4 6.2 5.8-1.1 8.8-7.8 10.3-15.1ZM6.5 18.5c2.4-3.9 5.5-7 9.4-9.3" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  phone: <path d="M5.4 3.8 8.7 3l1.7 4.3-2.2 1.3a15 15 0 0 0 7.2 7.2l1.3-2.2 4.3 1.7-.8 3.3c-.3 1.2-1.4 2-2.6 1.9C10.2 19.7 4.3 13.8 3.5 6.4c-.1-1.2.7-2.3 1.9-2.6Z" />,
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.8 21a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  sparkle: <path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z" />,
  spa: (
    <>
      <path d="M12 21c0-5 2.6-8.2 8-10-.1 5.5-2.8 9-8 10Z" />
      <path d="M12 21c0-5-2.6-8.2-8-10 .1 5.5 2.8 9 8 10Z" />
      <path d="M12 17c-3-3.2-3-7 0-11 3 4 3 7.8 0 11Z" />
    </>
  ),
};

export function VishuIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

export function Brand({ owner = false }: { owner?: boolean }) {
  return (
    <Link className="vishu-brand" href="/" aria-label="Salon Vishu トップへ">
      <span className="brand-monogram" aria-hidden="true">V</span>
      <span className="brand-copy">
        <strong>{owner ? "VISHU OWNER" : "VISHU"}</strong>
        <small>{owner ? "SALON MANAGEMENT" : "PRIVATE HAIR SALON"}</small>
      </span>
    </Link>
  );
}

export function SiteHeader({ owner = false }: { owner?: boolean }) {
  return (
    <header className={`site-header${owner ? " owner-header" : ""}`}>
      <Brand owner={owner} />
      {owner ? (
        <Link className="header-text-link" href="/">
          公開サイトへ
        </Link>
      ) : (
        <nav className="site-navigation" aria-label="メインナビゲーション">
          <Link href="/#concept">コンセプト</Link>
          <Link href="/#style-menu">メニュー・料金</Link>
          <Link href="/#access">アクセス</Link>
          <Link className="header-booking-link" href="/booking">
            Web予約
            <VishuIcon name="arrow" />
          </Link>
          <CustomerSessionAction />
        </nav>
      )}
    </header>
  );
}

export function PageFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <Brand />
        <p>今日より少し、好きな髪でいよう。</p>
      </div>
      <div className="footer-info">
        <span>大阪府河内長野市荘園町18-14</span>
        <span>9:00〜18:00 · 不定休</span>
        <a href="tel:0721218824">TEL 0721-21-8824</a>
      </div>
      <div className="footer-links">
        <Link href="/booking">Web予約</Link>
        <Link href="/login">ログイン</Link>
      </div>
      <p className="copyright">© SALON VISHU</p>
    </footer>
  );
}

import Link from "next/link";

type IconName =
  | "arrow"
  | "calendar"
  | "clock"
  | "cut"
  | "leaf"
  | "lock"
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
      <span className="brand-monogram" aria-hidden="true">
        V
      </span>
      <span className="brand-copy">
        <strong>{owner ? "VISHU OWNER" : "VISHU"}</strong>
        <small>{owner ? "SALON MANAGEMENT" : "HAIR & RELAXATION"}</small>
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
          <Link href="/#concept">私たちについて</Link>
          <Link href="/#menu">メニュー</Link>
          <Link href="/#access">サロン情報</Link>
          <Link className="header-booking-link" href="/booking">
            Web予約
            <VishuIcon name="arrow" />
          </Link>
        </nav>
      )}
    </header>
  );
}

export function BotanicalArtwork() {
  return (
    <svg
      className="botanical-artwork"
      viewBox="0 0 560 620"
      role="img"
      aria-label="葉とSalon VishuのVを組み合わせた装飾"
    >
      <defs>
        <linearGradient id="vishu-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#829579" />
          <stop offset="1" stopColor="#3f643e" />
        </linearGradient>
        <filter id="vishu-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#263326" floodOpacity=".15" />
        </filter>
      </defs>
      <circle cx="280" cy="285" r="220" fill="#f8f5ed" fillOpacity=".78" />
      <g filter="url(#vishu-shadow)">
        <path d="M150 126h82l48 287 48-287h82L315 480h-70L150 126Z" fill="url(#vishu-leaf)" />
        <path d="M280 411c-28-82-24-155 12-219 25-44 64-73 117-88-7 70-32 124-75 163-21 19-39 60-54 124Z" fill="#9aa589" />
        <path d="M283 403c12-89 52-180 119-272" fill="none" stroke="#eef0e8" strokeWidth="4" strokeLinecap="round" />
        <path d="M359 190c51-6 92 4 123 31-43 32-87 40-133 25" fill="#5f7653" />
        <path d="M393 220c28-2 52 0 76 3" fill="none" stroke="#dfe6d8" strokeWidth="3" strokeLinecap="round" />
        <path d="M329 269c-41-6-75 3-103 26 36 29 74 37 114 24" fill="#b6bea6" />
      </g>
      <g fill="none" stroke="#73836b" strokeLinecap="round" opacity=".38">
        <path d="M84 532c34-65 51-129 50-193" />
        <path d="M127 405c-34-3-57 8-70 34 34 6 58-6 70-34Z" fill="#cbd0bd" />
        <path d="M132 361c29-16 45-38 47-68-33 14-50 37-47 68Z" fill="#d5d8ca" />
        <path d="M460 545c-15-70-10-133 14-190" />
        <path d="M470 407c31-15 58-15 82 0-28 27-57 27-82 0Z" fill="#cbd0bd" />
      </g>
    </svg>
  );
}

export function PageFooter() {
  return (
    <footer className="site-footer" id="access">
      <div className="footer-main">
        <Brand />
        <p>髪と心に、深呼吸できる時間を。</p>
      </div>
      <div className="footer-info">
        <span>NIIGATA · PRIVATE HAIR SALON</span>
        <span>完全予約制</span>
      </div>
      <div className="footer-links">
        <Link href="/booking">Web予約</Link>
        <Link href="/admin/login">店主ログイン</Link>
      </div>
      <p className="copyright">© SALON VISHU</p>
    </footer>
  );
}

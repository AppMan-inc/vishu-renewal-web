import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_JP({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Noto_Serif_JP({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Salon Vishu | 大阪・河内長野のプライベートヘアサロン",
    template: "%s | Salon Vishu",
  },
  description:
    "大阪府河内長野市荘園町の完全予約制プライベートヘアサロン、Salon Vishu。ハーブカラー、酸性縮毛矯正、ヘッドスパなどをご提供します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-scroll-behavior="smooth">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}

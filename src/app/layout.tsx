import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Salon Vishu | Web予約",
    template: "%s | Salon Vishu",
  },
  description:
    "Salon Vishuの公式サイト。サロン情報のご案内とオンライン予約をご利用いただけます。",
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

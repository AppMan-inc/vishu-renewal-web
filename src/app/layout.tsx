import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Salon Vishu | 新潟のプライベートヘアサロン",
    template: "%s | Salon Vishu",
  },
  description:
    "髪と心に、深呼吸できる時間を。新潟のプライベートヘアサロン Salon Vishuの公式サイトです。",
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

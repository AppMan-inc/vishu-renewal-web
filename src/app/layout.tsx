import type { Metadata } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import { CustomerSessionProvider } from "@/features/auth/components/customer-session-provider";
import {
  defaultDescription,
  metadataBase,
} from "@/lib/site-metadata";
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
  metadataBase,
  title: {
    default: "河内長野市の美容室・完全予約制プライベートサロン | Salon Vishu",
    template: "%s | Salon Vishu",
  },
  description: defaultDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-scroll-behavior="smooth">
      <body className={`${sans.variable} ${serif.variable}`}>
        <CustomerSessionProvider>{children}</CustomerSessionProvider>
      </body>
    </html>
  );
}

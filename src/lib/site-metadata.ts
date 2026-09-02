import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";

export const siteName = "Salon Vishu";
export const defaultDescription =
  "大阪府河内長野市荘園町の美容室、Salon Vishu（サロン ヴィッシュ）。一席だけの完全予約制プライベートサロンです。ハーブカラー、縮毛矯正、髪質改善、ヘッドスパなどをご提供しています。";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
};

export function createPageMetadata({
  title,
  description,
  path,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName,
      locale: "ja_JP",
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Salon Vishu — 大阪・河内長野の一席だけのプライベートサロン",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export const metadataBase = siteUrl;

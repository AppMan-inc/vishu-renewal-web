import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { createPageMetadata, defaultDescription } from "@/lib/site-metadata";
import { absoluteSiteUrl } from "@/lib/site-url";

const hotPepperUrl = "https://beauty.hotpepper.jp/slnH000583006/";

export const metadata: Metadata = createPageMetadata({
  title: "河内長野市荘園町の美容室・プライベートサロン | Salon Vishu",
  description: defaultDescription,
  path: "/",
});

const salonJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${absoluteSiteUrl()}#hair-salon`,
  name: "Salon Vishu",
  alternateName: ["サロン ヴィッシュ", "サロンヴィッシュ"],
  description: "大阪府河内長野市荘園町にある、一席・スタイリスト一名の完全予約制プライベートサロンです。",
  url: absoluteSiteUrl(),
  image: absoluteSiteUrl("/images/salon-vishu-interior.webp"),
  telephone: "+81-721-21-8824",
  address: {
    "@type": "PostalAddress",
    addressRegion: "大阪府",
    addressLocality: "河内長野市",
    streetAddress: "荘園町18-14",
    addressCountry: "JP",
  },
  areaServed: ["河内長野市", "荘園町"],
  priceRange: "¥¥",
  sameAs: [hotPepperUrl],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(salonJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <HomePage />
    </>
  );
}

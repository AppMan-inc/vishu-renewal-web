import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { createPageMetadata, defaultDescription } from "@/lib/site-metadata";
import { absoluteSiteUrl } from "@/lib/site-url";

const hotPepperUrl = "https://beauty.hotpepper.jp/slnH000583006/";

export const metadata: Metadata = createPageMetadata({
  title: "河内長野市の美容室・完全予約制プライベートサロン | Salon Vishu",
  description: defaultDescription,
  path: "/",
});

const salonJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  "@id": `${absoluteSiteUrl()}#hair-salon`,
  name: "Salon Vishu",
  alternateName: ["サロン ヴィッシュ", "サロンヴィッシュ"],
  description: "大阪府河内長野市荘園町にある、一席・スタイリスト一名の完全予約制プライベート美容室です。髪質改善、酸性縮毛矯正、ハーブカラー、ヘッドスパなどをご提供しています。",
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
  areaServed: ["河内長野市", "荘園町", "千代田駅周辺", "河内長野駅周辺"],
  hasMap: "https://www.google.com/maps/search/?api=1&query=Salon%20Vishu%20%E5%A4%A7%E9%98%AA%E5%BA%9C%E6%B2%B3%E5%86%85%E9%95%B7%E9%87%8E%E5%B8%82%E8%8D%98%E5%9C%92%E7%94%BA18-14",
  amenityFeature: {
    "@type": "LocationFeatureSpecification",
    name: "店前駐車場",
    value: true,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "美容室メニュー",
    itemListElement: [
      "カット",
      "ハーブカラー",
      "髪質改善・酸性縮毛矯正",
      "ヘッドスパ",
    ].map((name) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name,
        areaServed: "河内長野市",
      },
    })),
  },
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

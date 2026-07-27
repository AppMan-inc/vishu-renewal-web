import { HomePage } from "@/components/home/home-page";

const hotPepperUrl = "https://beauty.hotpepper.jp/slnH000583006/";

const salonJsonLd = {
  "@context": "https://schema.org",
  "@type": "HairSalon",
  name: "Salon Vishu",
  alternateName: "サロンヴィッシュ",
  description: "大阪府河内長野市荘園町の、1席・スタイリスト1名の完全予約制プライベートヘアサロン。",
  telephone: "+81-721-21-8824",
  address: {
    "@type": "PostalAddress",
    addressRegion: "大阪府",
    addressLocality: "河内長野市",
    streetAddress: "荘園町18-14",
    addressCountry: "JP",
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

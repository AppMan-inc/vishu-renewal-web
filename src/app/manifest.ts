import type { MetadataRoute } from "next";
import { siteAssetPath } from "@/lib/site-path";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salon Vishu",
    short_name: "Vishu",
    description:
      "大阪府河内長野市荘園町の完全予約制プライベートヘアサロン、Salon Vishu。ハーブカラー、酸性縮毛矯正、ヘッドスパなどをご提供します。",
    start_url: siteAssetPath("/"),
    scope: siteAssetPath("/"),
    display: "standalone",
    background_color: "#fbf5f0",
    theme_color: "#713b48",
    icons: [
      {
        src: siteAssetPath("/icons/icon-192x192.png"),
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: siteAssetPath("/icons/icon-512x512.png"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

import type { MetadataRoute } from "next";
import { absoluteSiteUrl, siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/login",
        "/mypage/",
        "/password-reset",
        "/signup",
      ],
    },
    sitemap: absoluteSiteUrl("/sitemap.xml"),
    host: siteUrl.origin,
  };
}

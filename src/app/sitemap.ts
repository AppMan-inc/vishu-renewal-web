import type { MetadataRoute } from "next";
import { absoluteSiteUrl } from "@/lib/site-url";

const publicRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/booking", changeFrequency: "weekly", priority: 0.9 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map(({ path, changeFrequency, priority }) => ({
    url: absoluteSiteUrl(path),
    changeFrequency,
    priority,
  }));
}

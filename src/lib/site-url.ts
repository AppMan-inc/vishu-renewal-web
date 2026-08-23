const defaultSiteUrl = "https://vishu-renewal-web.salon-vishu.workers.dev/";

export const siteUrl = normalizeSiteUrl(process.env.SITE_URL ?? defaultSiteUrl);

export function absoluteSiteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function normalizeSiteUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("SITE_URL must use HTTPS.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("SITE_URL must be an HTTPS origin without credentials, query, or hash.");
  }

  if (url.pathname !== "/") {
    throw new Error("SITE_URL must not include a path.");
  }

  return url;
}

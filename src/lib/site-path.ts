export function siteAssetPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? ""}${normalizedPath}`;
}

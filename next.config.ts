import type { NextConfig } from "next";

const environment = process.env.VISHU_ENV;
const nextMode = process.env.VISHU_NEXT_MODE;
const isGitHubPagesBuild = process.env.PAGES_BASE_PATH !== undefined;
const siteBasePath = isGitHubPagesBuild ? process.env.PAGES_BASE_PATH ?? "" : "";

if (environment && environment !== "dev" && environment !== "prod") {
  throw new Error(`Unsupported VISHU_ENV '${environment}'. Use dev or prod.`);
}

if (
  nextMode &&
  nextMode !== "development" &&
  nextMode !== "production"
) {
  throw new Error(
    `Unsupported VISHU_NEXT_MODE '${nextMode}'. Use development or production.`,
  );
}

const nextConfig: NextConfig = {
  output: isGitHubPagesBuild ? "export" : undefined,
  basePath: isGitHubPagesBuild ? siteBasePath : undefined,
  trailingSlash: isGitHubPagesBuild,
  env: {
    NEXT_PUBLIC_SITE_BASE_PATH: siteBasePath,
  },
  images: {
    unoptimized: isGitHubPagesBuild,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
  // Keep dev-server caches and optimized builds for both Firebase projects
  // isolated. This also allows a build while a dev server is running.
  distDir: isGitHubPagesBuild
    ? "out"
    : environment && nextMode
      ? `.next/${environment}/${nextMode}`
      : ".next",
};

export default nextConfig;

import type { NextConfig } from "next";

const environment = process.env.VISHU_ENV;
const nextMode = process.env.VISHU_NEXT_MODE;
const isGitHubPagesBuild = process.env.PAGES_BASE_PATH !== undefined;

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
  basePath: isGitHubPagesBuild ? process.env.PAGES_BASE_PATH : undefined,
  trailingSlash: isGitHubPagesBuild,
  // Keep dev-server caches and optimized builds for both Firebase projects
  // isolated. This also allows a build while a dev server is running.
  distDir: isGitHubPagesBuild
    ? "out"
    : environment && nextMode
      ? `.next/${environment}/${nextMode}`
      : ".next",
};

export default nextConfig;

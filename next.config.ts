import type { NextConfig } from "next";

const environment = process.env.VISHU_ENV;
const nextMode = process.env.VISHU_NEXT_MODE;

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
  // Keep dev-server caches and optimized builds for both Firebase projects
  // isolated. This also allows a build while a dev server is running.
  distDir:
    environment && nextMode
      ? `.next/${environment}/${nextMode}`
      : ".next",
};

export default nextConfig;

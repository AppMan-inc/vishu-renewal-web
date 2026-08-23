import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig(),
  buildCommand: "npm run build:prod",
} satisfies OpenNextConfig;

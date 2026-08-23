import assert from "node:assert/strict";
import test from "node:test";
import {
  absoluteSiteUrl,
  normalizeSiteUrl,
  siteUrl,
} from "./site-url.ts";

test("uses the production site URL by default", () => {
  assert.equal(
    siteUrl.toString(),
    "https://vishu-renewal-web.salon-vishu.workers.dev/",
  );
  assert.equal(
    absoluteSiteUrl("/terms"),
    "https://vishu-renewal-web.salon-vishu.workers.dev/terms",
  );
});

test("normalizes a valid HTTPS origin", () => {
  assert.equal(
    normalizeSiteUrl("https://example.com").toString(),
    "https://example.com/",
  );
});

test("rejects an insecure or path-based site URL", () => {
  assert.throws(() => normalizeSiteUrl("http://example.com"), /HTTPS/);
  assert.throws(() => normalizeSiteUrl("https://example.com/path"), /path/);
});

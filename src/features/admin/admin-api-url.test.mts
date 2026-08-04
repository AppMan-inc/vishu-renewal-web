import assert from "node:assert/strict";
import test from "node:test";
import { adminApiUrl } from "./admin-api-url.ts";

test("builds the Firebase Functions admin API URL", () => {
  assert.equal(
    adminApiUrl("salon-vishu2-dev-30830", undefined, "session"),
    "https://asia-northeast2-salon-vishu2-dev-30830.cloudfunctions.net/adminApi/session",
  );
});

test("supports an emulator or custom API URL override", () => {
  assert.equal(
    adminApiUrl("unused", " http://127.0.0.1:5001/project/asia-northeast2/adminApi/ ", "/menu-image"),
    "http://127.0.0.1:5001/project/asia-northeast2/adminApi/menu-image",
  );
});

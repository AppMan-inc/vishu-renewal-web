import assert from "node:assert/strict";
import test from "node:test";
import { isAdminDocumentForUid } from "./admin-authorization.ts";

test("accepts only an adminUsers document whose uid matches the authenticated user", () => {
  assert.equal(isAdminDocumentForUid({ uid: "admin-1" }, "admin-1"), true);
  assert.equal(isAdminDocumentForUid({ uid: " admin-1 " }, "admin-1"), true);
  assert.equal(isAdminDocumentForUid({ uid: "admin-2" }, "admin-1"), false);
  assert.equal(isAdminDocumentForUid({}, "admin-1"), false);
  assert.equal(isAdminDocumentForUid(undefined, "admin-1"), false);
});

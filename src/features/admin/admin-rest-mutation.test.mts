import assert from "node:assert/strict";
import test from "node:test";
import { legacyRestMutations } from "./admin-rest-mutation.ts";

test("converts a batched rest registration for the legacy admin API", () => {
  assert.deepEqual(legacyRestMutations({
    action: "rest.apply",
    blocks: [{
      startTime: "2026-08-30T01:00:00.000Z",
      endTime: "2026-08-30T02:00:00.000Z",
    }],
    deleteIds: [],
  }), [{
    action: "rest.create",
    startTime: "2026-08-30T01:00:00.000Z",
    endTime: "2026-08-30T02:00:00.000Z",
  }]);
});

test("deletes replaced blocks before recreating their remaining ranges", () => {
  assert.deepEqual(legacyRestMutations({
    action: "rest.apply",
    blocks: [{
      startTime: "2026-08-30T01:30:00.000Z",
      endTime: "2026-08-30T02:00:00.000Z",
    }],
    deleteIds: ["rest-1"],
  }), [
    { action: "rest.delete", id: "rest-1" },
    {
      action: "rest.create",
      startTime: "2026-08-30T01:30:00.000Z",
      endTime: "2026-08-30T02:00:00.000Z",
    },
  ]);
});

test("does not reinterpret unrelated or malformed mutations", () => {
  assert.equal(legacyRestMutations({ action: "menu.save" }), null);
  assert.equal(legacyRestMutations({
    action: "rest.apply",
    blocks: [{ startTime: "invalid" }],
    deleteIds: [],
  }), null);
});

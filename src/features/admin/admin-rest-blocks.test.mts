import assert from "node:assert/strict";
import test from "node:test";
import {
  isClosureBlock,
  normalizeAdminRestBlocks,
} from "./admin-rest-blocks.ts";

test("treats legacy rest blocks without closure metadata as tappable rests", () => {
  const [rest] = normalizeAdminRestBlocks([{
    id: "legacy-rest",
    startTime: "2026-08-30T01:00:00.000Z",
    endTime: "2026-08-30T01:30:00.000Z",
    createdAt: "2026-08-29T00:00:00.000Z",
  }]);

  assert.equal(rest.closurePeriod, "custom");
  assert.equal(isClosureBlock(rest), false);
});

test("preserves explicit closure metadata", () => {
  const [closure] = normalizeAdminRestBlocks([{
    id: "closure",
    startTime: "2026-08-30T00:00:00.000Z",
    endTime: "2026-08-30T09:00:00.000Z",
    closurePeriod: "fullDay",
    closureGroupId: "group-1",
    businessDate: "2026-08-30",
  }]);

  assert.equal(closure.closurePeriod, "fullDay");
  assert.equal(closure.closureGroupId, "group-1");
  assert.equal(isClosureBlock(closure), true);
});

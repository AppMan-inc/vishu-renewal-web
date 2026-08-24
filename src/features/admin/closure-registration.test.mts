import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClosurePreview,
  groupClosureBlocks,
} from "./closure-registration.ts";
import type { AdminRestBlock } from "./types.ts";

const settings = {
  openingMinutes: 9 * 60,
  closingMinutes: 18 * 60,
  slotIntervalMinutes: 30,
  closedWeekdays: [3],
};
const now = new Date("2026-08-23T23:00:00.000Z");

test("builds an inclusive closure preview and skips closed weekdays", () => {
  const preview = buildClosurePreview({
    startDate: "2026-08-24",
    endDate: "2026-08-27",
    period: "fullDay",
  }, settings, now);

  assert.deepEqual(preview.businessDates, ["2026-08-24", "2026-08-25", "2026-08-27"]);
  assert.deepEqual(preview.skippedClosedDates, ["2026-08-26"]);
  assert.equal(preview.startMinutes, 9 * 60);
  assert.equal(preview.endMinutes, 18 * 60);
});

test("uses noon as the morning and afternoon boundary", () => {
  const morning = buildClosurePreview({
    startDate: "2026-08-25",
    endDate: "2026-08-25",
    period: "morning",
  }, settings, now);
  const afternoon = buildClosurePreview({
    startDate: "2026-08-25",
    endDate: "2026-08-25",
    period: "afternoon",
  }, settings, now);

  assert.deepEqual([morning.startMinutes, morning.endMinutes], [540, 720]);
  assert.deepEqual([afternoon.startMinutes, afternoon.endMinutes], [720, 1080]);
});

test("rejects invalid, expired, and longer than 90 day ranges", () => {
  assert.throws(() => buildClosurePreview({
    startDate: "2026-08-25",
    endDate: "2026-08-24",
    period: "fullDay",
  }, settings, now));
  assert.throws(() => buildClosurePreview({
    startDate: "2026-08-24",
    endDate: "2026-11-22",
    period: "fullDay",
  }, settings, now));
  assert.throws(() => buildClosurePreview({
    startDate: "2026-08-24",
    endDate: "2026-08-24",
    period: "fullDay",
  }, settings, new Date("2026-08-24T01:00:00.000Z")));
});

test("groups closures and leaves 30 minute rests out of the closure list", () => {
  const closure = block("closure-1", "2026-08-25T03:00:00.000Z", "afternoon", "group-1", "2026-08-25");
  const second = block("closure-2", "2026-08-26T03:00:00.000Z", "afternoon", "group-1", "2026-08-26");
  const rest = block("rest-1", "2026-08-25T01:00:00.000Z", "custom", null, null);

  const groups = groupClosureBlocks([second, rest, closure]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].closureGroupId, "group-1");
  assert.deepEqual(groups[0].blocks.map((item) => item.id), ["closure-1", "closure-2"]);
});

function block(
  id: string,
  startTime: string,
  closurePeriod: AdminRestBlock["closurePeriod"],
  closureGroupId: string | null,
  businessDate: string | null,
): AdminRestBlock {
  return {
    id,
    startTime,
    endTime: new Date(new Date(startTime).getTime() + 3_600_000).toISOString(),
    createdAt: startTime,
    closurePeriod,
    closureGroupId,
    businessDate,
  };
}

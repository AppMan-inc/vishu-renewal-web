import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRestChanges,
  mergeRestSlots,
  restSlotState,
} from "./rest-schedule.ts";
import type {
  AdminBookingSettings,
  AdminRestBlock,
} from "./types.ts";

const settings: AdminBookingSettings = {
  openingMinutes: 9 * 60,
  closingMinutes: 18 * 60,
  slotIntervalMinutes: 30,
  closedWeekdays: [],
};

test("merges adjacent slots while keeping gaps and dates separate", () => {
  const blocks = mergeRestSlots([
    "2026-08-07T02:00:00.000Z",
    "2026-08-07T02:30:00.000Z",
    "2026-08-07T05:00:00.000Z",
    "2026-08-08T01:00:00.000Z",
  ], 30);

  assert.deepEqual(blocks, [
    {
      startTime: "2026-08-07T02:00:00.000Z",
      endTime: "2026-08-07T03:00:00.000Z",
    },
    {
      startTime: "2026-08-07T05:00:00.000Z",
      endTime: "2026-08-07T05:30:00.000Z",
    },
    {
      startTime: "2026-08-08T01:00:00.000Z",
      endTime: "2026-08-08T01:30:00.000Z",
    },
  ]);
});

test("removes one registered slot and preserves the rest of its block", () => {
  const restBlocks: AdminRestBlock[] = [{
    id: "rest-1",
    startTime: "2026-08-07T01:00:00.000Z",
    endTime: "2026-08-07T02:00:00.000Z",
    createdAt: "2026-08-05T00:00:00.000Z",
  }];

  assert.deepEqual(buildRestChanges(
    [],
    ["2026-08-07T01:00:00.000Z"],
    restBlocks,
    30,
  ), {
    blocks: [{
      startTime: "2026-08-07T01:30:00.000Z",
      endTime: "2026-08-07T02:00:00.000Z",
    }],
    deleteIds: ["rest-1"],
  });
});

test("uses the same reservation, rest, selected, and unavailable priority as the app", () => {
  const slot = new Date(2026, 7, 7, 10);
  const key = slot.toISOString();
  const base = {
    slot,
    now: new Date(2026, 7, 5, 9),
    settings,
    reservations: [],
    restBlocks: [],
    selectedKeys: new Set([key]),
    pendingDeletionKeys: new Set<string>(),
  };
  assert.equal(restSlotState(base), "selected");
  assert.equal(restSlotState({
    ...base,
    restBlocks: [{
      id: "rest-1",
      startTime: slot.toISOString(),
      endTime: new Date(slot.getTime() + 30 * 60_000).toISOString(),
      createdAt: slot.toISOString(),
    }],
  }), "rest");
  assert.equal(restSlotState({
    ...base,
    reservations: [{
      id: "reservation-1",
      sourcePath: "reservation/reservation-1",
      customerId: "customer-1",
      customerName: "お客様",
      telephoneNumber: "",
      menuId: "menu-1",
      treatmentDetail: "カット",
      treatmentTimeMinutes: 30,
      price: 0,
      startTime: slot.toISOString(),
      finishTime: new Date(slot.getTime() + 30 * 60_000).toISOString(),
      customerHope: "",
      status: "confirmed",
      createdAt: slot.toISOString(),
    }],
  }), "reservation");
  assert.equal(restSlotState({
    ...base,
    slot: new Date(2026, 7, 7, 8, 30),
    selectedKeys: new Set(),
  }), "unavailable");
});

test("does not allow rest registration more than 90 days ahead", () => {
  const now = new Date("2026-08-05T00:00:00.000Z");
  const base = {
    now,
    settings,
    reservations: [],
    restBlocks: [],
    selectedKeys: new Set<string>(),
    pendingDeletionKeys: new Set<string>(),
  };

  assert.equal(restSlotState({
    ...base,
    slot: new Date("2026-11-03T00:00:00.000Z"),
  }), "available");
  assert.equal(restSlotState({
    ...base,
    slot: new Date("2026-11-03T00:00:00.001Z"),
  }), "unavailable");
});

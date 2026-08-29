import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRestChanges,
  availableRestSlotKeysForDay,
  mergeRestSlots,
  restSlotState,
  toggleRestSlotSelection,
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
    closurePeriod: "custom",
    closureGroupId: null,
    businessDate: null,
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

test("toggles a registered rest back to available and restores it on a second tap", () => {
  const key = "2026-08-07T01:00:00.000Z";
  const removed = toggleRestSlotSelection({
    key,
    isRegistered: true,
    selectedKeys: new Set(),
    pendingDeletionKeys: new Set(),
  });
  assert.deepEqual([...removed.selectedKeys], []);
  assert.deepEqual([...removed.pendingDeletionKeys], [key]);

  const restored = toggleRestSlotSelection({
    key,
    isRegistered: true,
    selectedKeys: removed.selectedKeys,
    pendingDeletionKeys: removed.pendingDeletionKeys,
  });
  assert.deepEqual([...restored.selectedKeys], []);
  assert.deepEqual([...restored.pendingDeletionKeys], []);
});

test("shows a registered rest as available while its deletion is pending", () => {
  const slot = new Date(2026, 7, 7, 10);
  const key = slot.toISOString();
  assert.equal(restSlotState({
    slot,
    now: new Date(2026, 7, 5, 9),
    settings,
    reservations: [],
    restBlocks: [{
      id: "rest-1",
      startTime: key,
      endTime: new Date(slot.getTime() + 30 * 60_000).toISOString(),
      createdAt: key,
      closurePeriod: "custom",
      closureGroupId: null,
      businessDate: null,
    }],
    selectedKeys: new Set(),
    pendingDeletionKeys: new Set([key]),
  }), "available");
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
      closurePeriod: "custom",
      closureGroupId: null,
      businessDate: null,
    }],
  }), "rest");
  assert.equal(restSlotState({
    ...base,
    restBlocks: [{
      id: "closure-1",
      startTime: slot.toISOString(),
      endTime: new Date(slot.getTime() + 30 * 60_000).toISOString(),
      createdAt: slot.toISOString(),
      closurePeriod: "fullDay",
      closureGroupId: "closure-group-1",
      businessDate: "2026-08-07",
    }],
  }), "closure");
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
      previousVisitAt: null,
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

test("selects every available slot for a tapped day", () => {
  const day = new Date(2026, 7, 7);
  const reservationStart = new Date(2026, 7, 7, 10);
  const restStart = new Date(2026, 7, 7, 11);
  const keys = availableRestSlotKeysForDay({
    day,
    now: new Date(2026, 7, 6, 9),
    settings,
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
      startTime: reservationStart.toISOString(),
      finishTime: new Date(2026, 7, 7, 10, 30).toISOString(),
      customerHope: "",
      status: "confirmed",
      previousVisitAt: null,
      createdAt: reservationStart.toISOString(),
    }],
    restBlocks: [{
      id: "rest-1",
      startTime: restStart.toISOString(),
      endTime: new Date(2026, 7, 7, 11, 30).toISOString(),
      createdAt: restStart.toISOString(),
      closurePeriod: "custom",
      closureGroupId: null,
      businessDate: null,
    }],
    selectedKeys: new Set(),
    pendingDeletionKeys: new Set(),
  });

  assert.equal(keys.length, 16);
  assert(!keys.includes(reservationStart.toISOString()));
  assert(!keys.includes(restStart.toISOString()));
  assert(keys.includes(new Date(2026, 7, 7, 9).toISOString()));
  assert(keys.includes(new Date(2026, 7, 7, 17, 30).toISOString()));
});

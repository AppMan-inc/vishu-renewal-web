import assert from "node:assert/strict";
import test from "node:test";

import type { BookingAvailability } from "./booking-availability.ts";
import {
  type BookingAvailabilityRange,
  createBookingAvailabilityStore,
} from "./booking-availability-prefetch.ts";

const firstWeek = range("2026-09-04T00:00:00.000Z");
const nextWeek = range("2026-09-11T00:00:00.000Z");

test("deduplicates simultaneous requests for the same period", async () => {
  let calls = 0;
  let resolveRequest!: (value: BookingAvailability) => void;
  const store = createBookingAvailabilityStore(() => {
    calls += 1;
    return new Promise((resolve) => {
      resolveRequest = resolve;
    });
  });

  const prefetched = store.prefetch(firstWeek);
  const requested = store.get(firstWeek);

  assert.equal(calls, 1);
  resolveRequest(liveAvailability());
  assert.equal(await prefetched, await requested);
});

test("reuses a successful result within 30 seconds", async () => {
  let calls = 0;
  let currentTime = 1_000;
  const store = createBookingAvailabilityStore(
    async () => {
      calls += 1;
      return liveAvailability();
    },
    { now: () => currentTime },
  );

  await store.prefetch(firstWeek);
  currentTime += 29_999;
  await store.get(firstWeek);

  assert.equal(calls, 1);
});

test("reloads an expired result", async () => {
  let calls = 0;
  let currentTime = 1_000;
  const store = createBookingAvailabilityStore(
    async () => {
      calls += 1;
      return liveAvailability();
    },
    { now: () => currentTime },
  );

  await store.prefetch(firstWeek);
  currentTime += 30_001;
  await store.get(firstWeek);

  assert.equal(calls, 2);
});

test("does not cache unavailable results", async () => {
  let calls = 0;
  const store = createBookingAvailabilityStore(async () => {
    calls += 1;
    return liveAvailability({ availabilityIsLive: false });
  });

  await store.prefetch(firstWeek);
  await store.get(firstWeek);

  assert.equal(calls, 2);
});

test("loads different periods independently", async () => {
  let calls = 0;
  const store = createBookingAvailabilityStore(async () => {
    calls += 1;
    return liveAvailability();
  });

  await Promise.all([store.get(firstWeek), store.get(nextWeek)]);

  assert.equal(calls, 2);
});

function range(from: string): BookingAvailabilityRange {
  const start = new Date(from);
  const until = new Date(start);
  until.setUTCDate(until.getUTCDate() + 7);
  return { from: start, until };
}

function liveAvailability(
  overrides: Partial<BookingAvailability> = {},
): BookingAvailability {
  return {
    openingMinutes: 9 * 60,
    closingMinutes: 18 * 60,
    slotIntervalMinutes: 30,
    closedWeekdays: new Set<number>(),
    reservations: [],
    restBlocks: [],
    availabilityIsLive: true,
    ...overrides,
  };
}

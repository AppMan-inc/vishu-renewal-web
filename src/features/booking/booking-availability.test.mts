import assert from "node:assert/strict";
import test from "node:test";

import {
  type BookingAvailability,
  bookingAvailabilityFromData,
  bookingSlotsForDate,
  unavailableBookingAvailability,
} from "./booking-availability.ts";

function availability(
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

function slotAt(
  hour: number,
  minute: number,
  durationMinutes: number,
  currentAvailability: BookingAvailability,
) {
  return bookingSlotsForDate({
    date: new Date(2026, 7, 7),
    durationMinutes,
    availability: currentAvailability,
    now: new Date(2026, 7, 5),
  }).find(
    (slot) =>
      slot.start.getHours() === hour && slot.start.getMinutes() === minute,
  );
}

test("maps the App availability contract including reservations and admin rests", () => {
  const result = bookingAvailabilityFromData({
    reservations: [
      {
        startAt: "2026-08-07T01:00:00.000Z",
        endAt: "2026-08-07T02:00:00.000Z",
      },
    ],
    blockedTimes: [
      {
        startAt: "2026-08-07T03:00:00.000Z",
        endAt: "2026-08-07T03:30:00.000Z",
      },
    ],
    settings: {
      openingMinutes: 600,
      closingMinutes: 1140,
      slotIntervalMinutes: 15,
      closedWeekdays: [2, 7, 9],
    },
  });

  assert.ok(result);
  assert.equal(result.openingMinutes, 600);
  assert.equal(result.closingMinutes, 1140);
  assert.equal(result.slotIntervalMinutes, 15);
  assert.deepEqual(result.closedWeekdays, new Set([2, 7]));
  assert.equal(result.reservations.length, 1);
  assert.equal(result.restBlocks.length, 1);
  assert.equal(result.availabilityIsLive, true);
});

test("rejects a slot overlapping another customer's reservation", () => {
  const slot = slotAt(
    10,
    30,
    60,
    availability({
      reservations: [
        {
          start: new Date(2026, 7, 7, 11),
          end: new Date(2026, 7, 7, 12),
        },
      ],
    }),
  );

  assert.equal(slot?.available, false);
});

test("rejects a slot overlapping an administrator rest block", () => {
  const slot = slotAt(
    12,
    0,
    60,
    availability({
      restBlocks: [
        {
          start: new Date(2026, 7, 7, 12, 30),
          end: new Date(2026, 7, 7, 13),
        },
      ],
    }),
  );

  assert.equal(slot?.available, false);
});

test("allows adjacent reservations but rejects treatment finishing after closing", () => {
  const currentAvailability = availability({
    reservations: [
      {
        start: new Date(2026, 7, 7, 11),
        end: new Date(2026, 7, 7, 12),
      },
    ],
  });

  assert.equal(slotAt(10, 0, 60, currentAvailability)?.available, true);
  assert.equal(slotAt(16, 0, 120, currentAvailability)?.available, true);
  assert.equal(slotAt(17, 0, 120, currentAvailability)?.available, false);
});

test("rejects closed weekdays and past slots like the App calendar", () => {
  const closedFriday = availability({ closedWeekdays: new Set([5]) });

  assert.equal(slotAt(10, 0, 60, closedFriday)?.available, false);

  const pastSlots = bookingSlotsForDate({
    date: new Date(2026, 7, 7),
    durationMinutes: 60,
    availability: availability(),
    now: new Date(2026, 7, 7, 10, 1),
  });
  const tenOClock = pastSlots.find(
    (slot) => slot.start.getHours() === 10 && slot.start.getMinutes() === 0,
  );
  assert.equal(tenOClock?.available, false);
});

test("fails closed while availability data is unavailable", () => {
  const slots = bookingSlotsForDate({
    date: new Date(2026, 7, 7),
    durationMinutes: 60,
    availability: unavailableBookingAvailability(),
    now: new Date(2026, 7, 5),
  });

  assert.ok(slots.length > 0);
  assert.equal(slots.every((slot) => !slot.available), true);
});

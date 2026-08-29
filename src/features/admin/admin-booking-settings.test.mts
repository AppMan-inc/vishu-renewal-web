import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ADMIN_BOOKING_SETTINGS,
  normalizeAdminBookingSettings,
} from "./admin-booking-settings.ts";

test("uses safe booking defaults when an older admin API omits settings", () => {
  assert.deepEqual(
    normalizeAdminBookingSettings(undefined),
    DEFAULT_ADMIN_BOOKING_SETTINGS,
  );
});

test("preserves valid settings and normalizes closed weekdays", () => {
  assert.deepEqual(normalizeAdminBookingSettings({
    openingMinutes: 600,
    closingMinutes: 1200,
    slotIntervalMinutes: 60,
    closedWeekdays: [7, 2, 2, 9, "3"],
  }), {
    openingMinutes: 600,
    closingMinutes: 1200,
    slotIntervalMinutes: 60,
    closedWeekdays: [2, 7],
  });
});

test("replaces invalid booking values before calendar slot generation", () => {
  assert.deepEqual(normalizeAdminBookingSettings({
    openingMinutes: -1,
    closingMinutes: 0,
    slotIntervalMinutes: 0,
    closedWeekdays: null,
  }), DEFAULT_ADMIN_BOOKING_SETTINGS);
});

import type { AdminBookingSettings } from "@/features/admin/types";

export const DEFAULT_ADMIN_BOOKING_SETTINGS: AdminBookingSettings = {
  openingMinutes: 9 * 60,
  closingMinutes: 18 * 60,
  slotIntervalMinutes: 30,
  closedWeekdays: [],
};

export function normalizeAdminBookingSettings(value: unknown): AdminBookingSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_ADMIN_BOOKING_SETTINGS, closedWeekdays: [] };
  }

  const settings = value as Record<string, unknown>;
  const openingMinutes = validInteger(settings.openingMinutes, 0, 23 * 60 + 59)
    ? settings.openingMinutes
    : DEFAULT_ADMIN_BOOKING_SETTINGS.openingMinutes;
  const requestedClosingMinutes = validInteger(settings.closingMinutes, 1, 24 * 60)
    ? settings.closingMinutes
    : DEFAULT_ADMIN_BOOKING_SETTINGS.closingMinutes;
  const closingMinutes = requestedClosingMinutes > openingMinutes
    ? requestedClosingMinutes
    : DEFAULT_ADMIN_BOOKING_SETTINGS.closingMinutes;
  const slotIntervalMinutes = validInteger(settings.slotIntervalMinutes, 1, 4 * 60)
    ? settings.slotIntervalMinutes
    : DEFAULT_ADMIN_BOOKING_SETTINGS.slotIntervalMinutes;
  const closedWeekdays = Array.isArray(settings.closedWeekdays)
    ? [...new Set(settings.closedWeekdays.filter((day): day is number =>
      validInteger(day, 1, 7)))].sort((a, b) => a - b)
    : [];

  return {
    openingMinutes,
    closingMinutes,
    slotIntervalMinutes,
    closedWeekdays,
  };
}

function validInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

export type TimeRange = {
  start: Date;
  end: Date;
};

export type BookingAvailability = {
  openingMinutes: number;
  closingMinutes: number;
  slotIntervalMinutes: number;
  closedWeekdays: Set<number>;
  reservations: TimeRange[];
  restBlocks: TimeRange[];
  availabilityIsLive: boolean;
};

export type BookingSlot = {
  start: Date;
  available: boolean;
};

const defaultOpeningMinutes = 9 * 60;
const defaultClosingMinutes = 18 * 60;
const defaultSlotIntervalMinutes = 30;

export function bookingAvailabilityFromData(
  value: unknown,
): BookingAvailability | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;
  const settings = recordValue(data.settings);
  return {
    openingMinutes:
      positiveInteger(settings.openingMinutes) ?? defaultOpeningMinutes,
    closingMinutes:
      positiveInteger(settings.closingMinutes) ?? defaultClosingMinutes,
    slotIntervalMinutes:
      positiveInteger(settings.slotIntervalMinutes) ??
      defaultSlotIntervalMinutes,
    closedWeekdays: integerSet(settings.closedWeekdays),
    reservations: timeRanges(data.reservations),
    restBlocks: timeRanges(data.blockedTimes),
    availabilityIsLive: true,
  };
}

export function unavailableBookingAvailability(): BookingAvailability {
  return {
    openingMinutes: defaultOpeningMinutes,
    closingMinutes: defaultClosingMinutes,
    slotIntervalMinutes: defaultSlotIntervalMinutes,
    closedWeekdays: new Set<number>(),
    reservations: [],
    restBlocks: [],
    availabilityIsLive: false,
  };
}

export function bookingSlotsForDate(args: {
  date: Date;
  durationMinutes: number;
  availability: BookingAvailability;
  now?: Date;
}): BookingSlot[] {
  const { date, availability } = args;
  const durationMinutes = args.durationMinutes > 0 ? args.durationMinutes : 60;
  const now = args.now ?? new Date();
  const weekday = date.getDay() === 0 ? 7 : date.getDay();
  const opening = atMinutes(date, availability.openingMinutes);
  const closing = atMinutes(date, availability.closingMinutes);
  const result: BookingSlot[] = [];

  for (
    let minutes = availability.openingMinutes;
    minutes < availability.closingMinutes;
    minutes += availability.slotIntervalMinutes
  ) {
    const start = atMinutes(date, minutes);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const available =
      availability.availabilityIsLive &&
      start >= now &&
      !availability.closedWeekdays.has(weekday) &&
      start >= opening &&
      end <= closing &&
      !overlapsAny(start, end, availability.reservations) &&
      !overlapsAny(start, end, availability.restBlocks);
    result.push({ start, available });
  }

  return result;
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}

function overlapsAny(start: Date, end: Date, ranges: TimeRange[]) {
  return ranges.some((range) => rangesOverlap(start, end, range.start, range.end));
}

function timeRanges(value: unknown): TimeRange[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const range = recordValue(item);
      const start = dateValue(range.startAt);
      const end = dateValue(range.endAt);
      return start && end && start < end ? { start, end } : null;
    })
    .filter((range): range is TimeRange => range !== null);
}

function atMinutes(date: Date, minutes: number) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Math.floor(minutes / 60),
    minutes % 60,
  );
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function dateValue(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function positiveInteger(value: unknown) {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function integerSet(value: unknown) {
  if (!Array.isArray(value)) return new Set<number>();
  return new Set(
    value
      .map(numberValue)
      .filter(
        (item): item is number =>
          item !== null && Number.isInteger(item) && item >= 1 && item <= 7,
      ),
  );
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

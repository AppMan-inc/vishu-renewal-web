import type {
  AdminBookingSettings,
  AdminReservation,
  AdminRestBlock,
} from "./types.ts";

export type RestSlotState =
  | "available"
  | "unavailable"
  | "reservation"
  | "rest"
  | "selected";

export type RestSlot = {
  startTime: string;
  endTime: string;
};

export const MAX_REST_ADVANCE_DAYS = 90;

export function slotKey(date: Date) {
  return date.toISOString();
}

export function rangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}

export function mergeRestSlots(
  starts: Iterable<string>,
  durationMinutes: number,
): RestSlot[] {
  const sorted = [...starts].map((value) => new Date(value))
    .sort((a, b) => a.getTime() - b.getTime());
  return mergeRanges(sorted.map((start) => ({
    startTime: start.toISOString(),
    endTime: addMinutes(start, durationMinutes).toISOString(),
  })));
}

export function buildRestChanges(
  selectedKeys: Iterable<string>,
  pendingDeletionKeys: Iterable<string>,
  restBlocks: AdminRestBlock[],
  durationMinutes: number,
) {
  const deletedSlots = [...pendingDeletionKeys].map((value) => ({
    start: new Date(value),
    end: addMinutes(new Date(value), durationMinutes),
  }));
  const affectedBlocks = restBlocks.filter((block) =>
    deletedSlots.some((slot) => rangesOverlap(
      slot.start,
      slot.end,
      new Date(block.startTime),
      new Date(block.endTime),
    )),
  );
  const replacements: RestSlot[] = [];
  for (const block of affectedBlocks) {
    let start = new Date(block.startTime);
    const blockEnd = new Date(block.endTime);
    while (start < blockEnd) {
      const end = new Date(Math.min(
        addMinutes(start, durationMinutes).getTime(),
        blockEnd.getTime(),
      ));
      const removed = deletedSlots.some((slot) =>
        rangesOverlap(slot.start, slot.end, start, end));
      if (!removed) {
        replacements.push({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        });
      }
      start = end;
    }
  }
  return {
    blocks: mergeRanges([
      ...mergeRestSlots(selectedKeys, durationMinutes),
      ...replacements,
    ]),
    deleteIds: affectedBlocks.map((block) => block.id),
  };
}

function mergeRanges(ranges: RestSlot[]) {
  const sorted = [...ranges].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  if (sorted.length === 0) return [];
  const blocks: RestSlot[] = [];
  let current = sorted[0];
  for (const range of sorted.slice(1)) {
    const currentStart = new Date(current.startTime);
    if (
      sameDate(currentStart, new Date(range.startTime)) &&
      current.endTime === range.startTime
    ) {
      current = { ...current, endTime: range.endTime };
      continue;
    }
    blocks.push(current);
    current = range;
  }
  blocks.push(current);
  return blocks;
}

export function restSlotState(args: {
  slot: Date;
  now: Date;
  settings: AdminBookingSettings;
  reservations: AdminReservation[];
  restBlocks: AdminRestBlock[];
  selectedKeys: ReadonlySet<string>;
  pendingDeletionKeys: ReadonlySet<string>;
}): RestSlotState {
  const { slot, now, settings, reservations, restBlocks } = args;
  const end = addMinutes(slot, settings.slotIntervalMinutes);
  if (reservations.some((reservation) =>
    reservation.status !== "canceled" && rangesOverlap(
      slot,
      end,
      new Date(reservation.startTime),
      new Date(reservation.finishTime),
    ))) return "reservation";

  const overlapsRest = restBlocks.some((block) => rangesOverlap(
    slot,
    end,
    new Date(block.startTime),
    new Date(block.endTime),
  ));
  const key = slotKey(slot);
  if (overlapsRest && !args.pendingDeletionKeys.has(key)) return "rest";

  const minutes = slot.getHours() * 60 + slot.getMinutes();
  const weekday = slot.getDay() === 0 ? 7 : slot.getDay();
  if (
    slot < now ||
    slot.getTime() > now.getTime() + MAX_REST_ADVANCE_DAYS * 24 * 60 * 60_000 ||
    args.settings.closedWeekdays.includes(weekday) ||
    minutes < settings.openingMinutes ||
    minutes + settings.slotIntervalMinutes > settings.closingMinutes
  ) return "unavailable";

  return args.selectedKeys.has(key) ? "selected" : "available";
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

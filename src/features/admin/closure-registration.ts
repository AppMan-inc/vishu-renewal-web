import type {
  AdminBookingSettings,
  AdminRestBlock,
  ClosurePeriod,
} from "./types.ts";

export const MAX_CLOSURE_RANGE_DAYS = 90;

export type ClosureRangeMode = "single" | "range";
export type SelectableClosurePeriod = Exclude<ClosurePeriod, "custom">;

export type ClosurePreview = {
  startDate: string;
  endDate: string;
  period: SelectableClosurePeriod;
  startMinutes: number;
  endMinutes: number;
  businessDates: string[];
  skippedClosedDates: string[];
};

export type ClosureGroup = {
  key: string;
  closureGroupId: string | null;
  period: SelectableClosurePeriod;
  startDate: string;
  endDate: string;
  blocks: AdminRestBlock[];
};

export function buildClosurePreview(
  input: {
    startDate: string;
    endDate: string;
    period: SelectableClosurePeriod;
  },
  settings: AdminBookingSettings,
  now = new Date(),
): ClosurePreview {
  const startDay = dateNumber(input.startDate);
  const endDay = dateNumber(input.endDate);
  if (startDay === null || endDay === null || endDay < startDay) {
    throw new Error("休業する日付を確認してください。");
  }
  const dayCount = Math.round((endDay - startDay) / 86_400_000) + 1;
  if (dayCount > MAX_CLOSURE_RANGE_DAYS) {
    throw new Error("期間は90日以内で選択してください。");
  }
  if (
    settings.openingMinutes >= settings.closingMinutes ||
    settings.slotIntervalMinutes <= 0 ||
    (12 * 60 - settings.openingMinutes) % settings.slotIntervalMinutes !== 0
  ) {
    throw new Error("営業時間の設定を確認してください。");
  }

  const startMinutes = input.period === "afternoon"
    ? 12 * 60
    : settings.openingMinutes;
  const endMinutes = input.period === "morning"
    ? 12 * 60
    : settings.closingMinutes;
  if (startMinutes >= endMinutes) {
    throw new Error(`${closurePeriodLabel(input.period)}を登録できる営業時間ではありません。`);
  }

  const today = tokyoDateKey(now);
  const nowMinutes = tokyoMinutes(now);
  const businessDates: string[] = [];
  const skippedClosedDates: string[] = [];
  for (let value = startDay; value <= endDay; value += 86_400_000) {
    const date = dateKeyFromNumber(value);
    const weekday = weekdayFromNumber(value);
    if (settings.closedWeekdays.includes(weekday)) {
      skippedClosedDates.push(date);
      continue;
    }
    if (date < today || (date === today && startMinutes <= nowMinutes)) {
      throw new Error("開始時刻を過ぎた休業は登録できません。");
    }
    businessDates.push(date);
  }
  if (businessDates.length === 0) {
    throw new Error("選択期間に登録できる営業日がありません。");
  }

  return {
    ...input,
    startMinutes,
    endMinutes,
    businessDates,
    skippedClosedDates,
  };
}

export function groupClosureBlocks(blocks: AdminRestBlock[]): ClosureGroup[] {
  const groups = new Map<string, AdminRestBlock[]>();
  for (const block of blocks) {
    if (!isClosureBlock(block)) continue;
    const key = block.closureGroupId ?? `single:${block.id}`;
    groups.set(key, [...(groups.get(key) ?? []), block]);
  }
  return [...groups.entries()]
    .map(([key, groupBlocks]) => {
      const sorted = [...groupBlocks].sort((a, b) =>
        closureBusinessDate(a).localeCompare(closureBusinessDate(b)));
      return {
        key,
        closureGroupId: sorted[0].closureGroupId,
        period: sorted[0].closurePeriod as SelectableClosurePeriod,
        startDate: closureBusinessDate(sorted[0]),
        endDate: closureBusinessDate(sorted[sorted.length - 1]),
        blocks: sorted,
      };
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function isClosureBlock(block: AdminRestBlock) {
  return block.closurePeriod !== "custom";
}

export function closureBusinessDate(block: AdminRestBlock) {
  return block.businessDate ?? tokyoDateKey(new Date(block.startTime));
}

export function closurePeriodLabel(period: ClosurePeriod) {
  return {
    fullDay: "終日",
    morning: "午前",
    afternoon: "午後",
    custom: "休憩",
  }[period];
}

export function minutesLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function tokyoDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addCalendarDays(date: string, days: number) {
  const value = dateNumber(date);
  if (value === null) throw new Error("日付を確認してください。");
  return dateKeyFromNumber(value + days * 86_400_000);
}

function tokyoMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.hour) * 60 + Number(value.minute) + Number(value.second) / 60;
}

function dateNumber(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const number = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return dateKeyFromNumber(number) === value ? number : null;
}

function dateKeyFromNumber(value: number) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function weekdayFromNumber(value: number) {
  const weekday = new Date(value).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

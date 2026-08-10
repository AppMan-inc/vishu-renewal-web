import assert from "node:assert/strict";
import test from "node:test";

import { japaneseHolidayName } from "./japanese-holidays.ts";

test("returns Japanese national holidays in the rest registration range", () => {
  assert.equal(japaneseHolidayName(new Date(2026, 7, 11)), "山の日");
  assert.equal(japaneseHolidayName(new Date(2026, 8, 21)), "敬老の日");
  assert.equal(japaneseHolidayName(new Date(2026, 8, 23)), "秋分の日");
  assert.equal(japaneseHolidayName(new Date(2026, 10, 3)), "文化の日");
});

test("includes substitute holidays and citizens holidays", () => {
  assert.equal(japaneseHolidayName(new Date(2026, 4, 6)), "振替休日");
  assert.equal(japaneseHolidayName(new Date(2026, 8, 22)), "国民の休日");
});

test("does not mark an ordinary weekend as a national holiday", () => {
  assert.equal(japaneseHolidayName(new Date(2026, 10, 7)), null);
  assert.equal(japaneseHolidayName(new Date(2026, 10, 8)), null);
});

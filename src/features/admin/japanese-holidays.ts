type HolidayMap = Map<string, string>;

export function japaneseHolidayName(date: Date) {
  return holidaysForYear(date.getFullYear()).get(dateKey(date)) ?? null;
}

function holidaysForYear(year: number) {
  const holidays: HolidayMap = new Map();
  for (const targetYear of [year - 1, year, year + 1]) {
    addBaseHolidays(holidays, targetYear);
  }

  addCitizensHolidays(holidays, year);
  addSubstituteHolidays(holidays, year);
  return holidays;
}

function addBaseHolidays(holidays: HolidayMap, year: number) {
  add(holidays, year, 1, 1, "元日");
  addNthWeekday(holidays, year, 1, 1, 2, "成人の日");
  add(holidays, year, 2, 11, "建国記念の日");
  if (year >= 2020) add(holidays, year, 2, 23, "天皇誕生日");
  add(holidays, year, 3, vernalEquinoxDay(year), "春分の日");
  add(holidays, year, 4, 29, "昭和の日");
  add(holidays, year, 5, 3, "憲法記念日");
  add(holidays, year, 5, 4, "みどりの日");
  add(holidays, year, 5, 5, "こどもの日");

  if (year === 2020) add(holidays, year, 7, 23, "海の日");
  else if (year === 2021) add(holidays, year, 7, 22, "海の日");
  else addNthWeekday(holidays, year, 7, 1, 3, "海の日");

  if (year === 2020) add(holidays, year, 8, 10, "山の日");
  else if (year === 2021) add(holidays, year, 8, 8, "山の日");
  else if (year >= 2016) add(holidays, year, 8, 11, "山の日");

  addNthWeekday(holidays, year, 9, 1, 3, "敬老の日");
  add(holidays, year, 9, autumnEquinoxDay(year), "秋分の日");

  if (year === 2020) add(holidays, year, 7, 24, "スポーツの日");
  else if (year === 2021) add(holidays, year, 7, 23, "スポーツの日");
  else addNthWeekday(holidays, year, 10, 1, 2, "スポーツの日");

  add(holidays, year, 11, 3, "文化の日");
  add(holidays, year, 11, 23, "勤労感謝の日");
}

function addCitizensHolidays(holidays: HolidayMap, year: number) {
  const date = new Date(year, 0, 2);
  const end = new Date(year, 11, 30);
  while (date <= end) {
    const key = dateKey(date);
    if (!holidays.has(key)) {
      const previous = dateKey(addDays(date, -1));
      const next = dateKey(addDays(date, 1));
      if (holidays.has(previous) && holidays.has(next)) {
        holidays.set(key, "国民の休日");
      }
    }
    date.setDate(date.getDate() + 1);
  }
}

function addSubstituteHolidays(holidays: HolidayMap, year: number) {
  const sundayHolidays = [...holidays.entries()]
    .filter(([key]) => key.startsWith(`${year}-`) && dateFromKey(key).getDay() === 0);
  for (const [key] of sundayHolidays) {
    let substitute = addDays(dateFromKey(key), 1);
    while (holidays.has(dateKey(substitute))) substitute = addDays(substitute, 1);
    holidays.set(dateKey(substitute), "振替休日");
  }
}

function add(holidays: HolidayMap, year: number, month: number, day: number, name: string) {
  holidays.set(dateKey(new Date(year, month - 1, day)), name);
}

function addNthWeekday(holidays: HolidayMap, year: number, month: number, weekday: number, occurrence: number, name: string) {
  const first = new Date(year, month - 1, 1);
  const day = 1 + (weekday - first.getDay() + 7) % 7 + (occurrence - 1) * 7;
  add(holidays, year, month, day, name);
}

function vernalEquinoxDay(year: number) {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function autumnEquinoxDay(year: number) {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

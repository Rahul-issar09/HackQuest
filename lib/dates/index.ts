import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";

/** Dates that represent a calendar day (no time) are stored as "YYYY-MM-DD" local-day strings in the UI
 *  and as BSON Dates (UTC midnight of that day) in MongoDB. These helpers convert between them safely. */
export function toDayKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10); // day fields are UTC-midnight Dates -> ISO strings
  return format(d, "yyyy-MM-dd");
}

/** Parse "YYYY-MM-DD" (or an ISO string) as a *local* calendar day at 00:00. */
export function parseDay(value: string): Date {
  const key = value.slice(0, 10);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Days remaining until the exam, by local calendar date. Negative when past. */
export function daysUntil(examDate: string, now: Date = new Date()): number {
  return differenceInCalendarDays(parseDay(examDate), startOfDay(now));
}

export function addDaysToKey(key: string, n: number): string {
  return toDayKey(addDays(parseDay(key), n));
}

/** Preparation day number (1-based) for `now`, or null if outside the window. */
export function currentPrepDay(startDate: string, endDate: string, now: Date = new Date()): number | null {
  const n = differenceInCalendarDays(startOfDay(now), parseDay(startDate)) + 1;
  const total = differenceInCalendarDays(parseDay(endDate), parseDay(startDate)) + 1;
  return n >= 1 && n <= total ? n : null;
}

export function weekRange(now: Date = new Date()): { from: Date; to: Date } {
  const from = startOfDay(addDays(now, -((now.getDay() + 6) % 7))); // Monday
  return { from, to: addDays(from, 7) };
}

export { parseISO };

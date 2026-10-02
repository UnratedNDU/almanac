import type { OccurrenceView } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");

export const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local midnight of the date part of `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`. */
export function fromIsoDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Moves by whole months; the day is clamped to the end of a shorter month (31 Jan + 1 month = 28 Feb). */
export function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
}

/** `weekStart`: 0 = Sunday .. 6 = Saturday. */
export function startOfWeek(d: Date, weekStart: number): Date {
  return addDays(d, -((d.getDay() - weekStart + 7) % 7));
}

/** Six full weeks covering the month, so the grid never changes height. */
export function monthGrid(year: number, month: number, weekStart: number): Date[] {
  const start = startOfWeek(new Date(year, month, 1), weekStart);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function weekDays(d: Date, weekStart: number): Date[] {
  const start = startOfWeek(d, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const isSameDay = (a: Date, b: Date) => toIsoDate(a) === toIsoDate(b);

type Span = Pick<OccurrenceView, "start" | "end" | "allDay">;

const MAX_SPAN_DAYS = 366;

/** Every `YYYY-MM-DD` the occurrence touches. All-day `end` is inclusive. */
export function daysCovered({ start, end, allDay }: Span): string[] {
  const first = fromIsoDate(start);
  let last = end ? fromIsoDate(end) : first;
  // A timed event that ends exactly at midnight does not touch the next day.
  if (!allDay && end?.endsWith("T00:00") && last > first) last = addDays(last, -1);
  const days: string[] = [];
  for (let d = first; d <= last && days.length < MAX_SPAN_DAYS; d = addDays(d, 1)) days.push(toIsoDate(d));
  return days;
}

/** Occurrences keyed by each requested day they cover, in the order given. */
export function groupByDay<T extends Span>(occurrences: T[], days: string[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>(days.map((day) => [day, []]));
  for (const occurrence of occurrences) {
    for (const day of daysCovered(occurrence)) grouped.get(day)?.push(occurrence);
  }
  return grouped;
}
/** The interface is Spanish, so dates are always formatted for Spanish regardless of the system language. */
const LOCALE = "es";

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const monthYear = (d: Date) =>
  upperFirst(new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(d));

export const dayLong = (d: Date) =>
  upperFirst(new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" }).format(d));

export const dayLongWithYear = (d: Date) =>
  upperFirst(new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d));

export function weekRange(first: Date, last: Date): string {
  const format = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short" });
  return `${format.formatRange(first, last)} ${last.getFullYear()}`;
}

/** Short month names, January first. */
export function monthLabels(): string[] {
  const format = new Intl.DateTimeFormat(LOCALE, { month: "short" });
  return Array.from({ length: 12 }, (_, m) => upperFirst(format.format(new Date(2024, m, 1))));
}

/** Weekday names starting at `weekStart` (0 = Sunday). */
export function weekdayLabels(weekStart: number, style: "short" | "long" | "narrow"): string[] {
  const format = new Intl.DateTimeFormat(LOCALE, { weekday: style });
  // 2024-01-07 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => upperFirst(format.format(new Date(2024, 0, 7 + ((weekStart + i) % 7)))));
}

export const hourLabel = (hour: number) =>
  new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hour));

/** `HH:MM` from a timed value such as `2026-08-20T09:30`. */
export const clock = (value: string) => value.slice(11, 16);

/** Minutes since midnight for a timed value. */
export const minutesOfDay = (value: string) => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
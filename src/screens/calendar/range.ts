import { addDays, addMonths, monthGrid, toIsoDate, weekDays } from "../../lib/dates";
import { dayLongWithYear, monthYear, weekRange } from "../../lib/format";
import { AGENDA_DAYS } from "./AgendaView";
import type { View } from "./types";

/** The `[from, to)` dates the view needs from the vault. */
export function rangeFor(view: View, cursor: Date, weekStart: number): { from: string; to: string } {
  switch (view) {
    case "month": {
      const grid = monthGrid(cursor.getFullYear(), cursor.getMonth(), weekStart);
      return { from: toIsoDate(grid[0]), to: toIsoDate(addDays(grid[grid.length - 1], 1)) };
    }
    case "week": {
      const days = weekDays(cursor, weekStart);
      return { from: toIsoDate(days[0]), to: toIsoDate(addDays(days[6], 1)) };
    }
    case "day":
      return { from: toIsoDate(cursor), to: toIsoDate(addDays(cursor, 1)) };
    case "agenda":
      return { from: toIsoDate(cursor), to: toIsoDate(addDays(cursor, AGENDA_DAYS)) };
  }
}

/** Previous (`-1`) or next (`1`) page of the view. */
export function moveCursor(view: View, cursor: Date, direction: 1 | -1): Date {
  switch (view) {
    case "month":
      return addMonths(cursor, direction);
    case "week":
      return addDays(cursor, 7 * direction);
    case "day":
      return addDays(cursor, direction);
    case "agenda":
      return addDays(cursor, 30 * direction);
  }
}

export function titleFor(view: View, cursor: Date, weekStart: number): string {
  switch (view) {
    case "month":
    case "agenda":
      return monthYear(cursor);
    case "week": {
      const days = weekDays(cursor, weekStart);
      return weekRange(days[0], days[6]);
    }
    case "day":
      return dayLongWithYear(cursor);
  }
}
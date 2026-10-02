import { describe, expect, it } from "vitest";
import type { OccurrenceView } from "../types";
import { addDays, addMonths, daysCovered, fromIsoDate, groupByDay, monthGrid, startOfWeek, toIsoDate, weekDays } from "./dates";

const occurrence = (eventId: string, start: string, end: string | null, allDay: boolean): OccurrenceView => ({
  eventId, start, end, allDay, recurring: false, title: eventId, color: "", kind: "event", categoryId: null,
});
const iso = (days: Date[]) => days.map(toIsoDate);

describe("iso dates", () => {
  it("round-trips local calendar days", () => {
    expect(toIsoDate(fromIsoDate("2026-10-02"))).toBe("2026-10-02");
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("reads the date part of a timed value", () => {
    expect(toIsoDate(fromIsoDate("2026-08-20T09:30"))).toBe("2026-08-20");
  });
});

describe("date arithmetic", () => {
  it("adds days across month and year boundaries", () => {
    expect(toIsoDate(addDays(fromIsoDate("2026-12-31"), 1))).toBe("2027-01-01");
    expect(toIsoDate(addDays(fromIsoDate("2026-03-01"), -1))).toBe("2026-02-28");
  });

  it("adds months and clamps to the end of a shorter month", () => {
    expect(toIsoDate(addMonths(fromIsoDate("2026-01-31"), 1))).toBe("2026-02-28");
    expect(toIsoDate(addMonths(fromIsoDate("2026-12-15"), 1))).toBe("2027-01-15");
    expect(toIsoDate(addMonths(fromIsoDate("2026-01-15"), -1))).toBe("2025-12-15");
  });

  it("finds the start of the week for either first day", () => {
    const friday = fromIsoDate("2026-10-02");
    expect(toIsoDate(startOfWeek(friday, 1))).toBe("2026-09-28");
    expect(toIsoDate(startOfWeek(friday, 0))).toBe("2026-09-27");
    expect(toIsoDate(startOfWeek(fromIsoDate("2026-09-28"), 1))).toBe("2026-09-28");
  });
});

describe("grids", () => {
  it("builds a 42 day month grid that starts on the chosen weekday and includes the 1st", () => {
    const monday = iso(monthGrid(2026, 9, 1));
    expect(monday).toHaveLength(42);
    expect(monday[0]).toBe("2026-09-28");
    expect(monday).toContain("2026-10-01");
    expect(monday[41]).toBe("2026-11-08");
    expect(iso(monthGrid(2026, 9, 0))[0]).toBe("2026-09-27");
  });

  it("builds seven consecutive days for a week", () => {
    const week = iso(weekDays(fromIsoDate("2026-10-02"), 1));
    expect(week[0]).toBe("2026-09-28");
    expect(week[6]).toBe("2026-10-04");
  });
});

describe("daysCovered", () => {
  it("lists every day of a multi-day all-day event, end date inclusive", () => {
    expect(daysCovered({ start: "2026-07-30", end: "2026-08-02", allDay: true })).toEqual([
      "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02",
    ]);
  });

  it("covers one day when there is no end", () => {
    expect(daysCovered({ start: "2026-08-20T09:00", end: null, allDay: false })).toEqual(["2026-08-20"]);
  });

  it("covers both days of an overnight event but not a day that starts at midnight", () => {
    expect(daysCovered({ start: "2026-08-20T22:00", end: "2026-08-21T02:00", allDay: false })).toEqual([
      "2026-08-20", "2026-08-21",
    ]);
    expect(daysCovered({ start: "2026-08-20T22:00", end: "2026-08-21T00:00", allDay: false })).toEqual(["2026-08-20"]);
  });

  it("never returns more than a year for a corrupt range", () => {
    expect(daysCovered({ start: "2026-01-01", end: "2999-01-01", allDay: true }).length).toBeLessThanOrEqual(366);
  });
});

describe("groupByDay", () => {
  it("places each occurrence on every day it covers and keeps only requested days", () => {
    const occ = [
      occurrence("a", "2026-08-01", "2026-08-02", true),
      occurrence("b", "2026-08-02T10:00", null, false),
    ];
    const grouped = groupByDay(occ, ["2026-08-01", "2026-08-02", "2026-08-03"]);
    expect(grouped.get("2026-08-01")?.map((o) => o.eventId)).toEqual(["a"]);
    expect(grouped.get("2026-08-02")?.map((o) => o.eventId)).toEqual(["a", "b"]);
    expect(grouped.get("2026-08-03")).toEqual([]);
  });
});
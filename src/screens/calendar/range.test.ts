import { describe, expect, it } from "vitest";
import { fromIsoDate } from "../../lib/dates";
import { moveCursor, rangeFor } from "./range";

const d = fromIsoDate;

describe("rangeFor", () => {
  it("covers the six-week grid for the month view", () => {
    expect(rangeFor("month", d("2026-10-15"), 1)).toEqual({ from: "2026-09-28", to: "2026-11-09" });
  });

  it("covers the week for the week view, honoring the first weekday", () => {
    expect(rangeFor("week", d("2026-10-02"), 1)).toEqual({ from: "2026-09-28", to: "2026-10-05" });
    expect(rangeFor("week", d("2026-10-02"), 0)).toEqual({ from: "2026-09-27", to: "2026-10-04" });
  });

  it("covers one day for the day view", () => {
    expect(rangeFor("day", d("2026-10-02"), 1)).toEqual({ from: "2026-10-02", to: "2026-10-03" });
  });

  it("covers sixty days from the cursor for the agenda", () => {
    expect(rangeFor("agenda", d("2026-10-02"), 1)).toEqual({ from: "2026-10-02", to: "2026-12-01" });
  });
});

describe("moveCursor", () => {
  it("moves by a month, week, day or thirty days depending on the view", () => {
    expect(moveCursor("month", d("2026-01-31"), 1)).toEqual(d("2026-02-28"));
    expect(moveCursor("week", d("2026-10-02"), -1)).toEqual(d("2026-09-25"));
    expect(moveCursor("day", d("2026-10-02"), 1)).toEqual(d("2026-10-03"));
    expect(moveCursor("agenda", d("2026-10-02"), 1)).toEqual(d("2026-11-01"));
  });
});
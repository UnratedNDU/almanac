import { describe, expect, it } from "vitest";
import { principalPhase } from "./moon";

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);
const phasesAround = (y: number, m: number, d: number) =>
  [-1, 0, 1].map((offset) => principalPhase(day(y, m, d + offset)));

describe("principalPhase", () => {
  it("flags a full moon within a day of the real one (2025-03-14)", () => {
    expect(phasesAround(2025, 3, 14)).toContain("full");
  });

  it("flags a new moon within a day of the real one (2025-03-29)", () => {
    expect(phasesAround(2025, 3, 29)).toContain("new");
  });

  it("flags a first and a last quarter in the same lunation", () => {
    const month = Array.from({ length: 30 }, (_, i) => principalPhase(day(2025, 3, 1 + i)));
    expect(month).toContain("first");
    expect(month).toContain("last");
  });

  it("marks roughly four days per lunation, about 49 in a year", () => {
    const flagged = Array.from({ length: 365 }, (_, i) => principalPhase(day(2026, 1, 1 + i))).filter(Boolean);
    expect(flagged.length).toBeGreaterThanOrEqual(47);
    expect(flagged.length).toBeLessThanOrEqual(51);
  });

  it("returns null on ordinary days", () => {
    const flagged = Array.from({ length: 29 }, (_, i) => principalPhase(day(2026, 3, 1 + i)));
    expect(flagged.filter((p) => p === null).length).toBeGreaterThan(20);
  });
});
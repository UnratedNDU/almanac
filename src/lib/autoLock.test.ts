import { describe, expect, it } from "vitest";
import { shouldLock } from "./autoLock";

const MINUTE = 60_000;

describe("shouldLock", () => {
  it("locks once the idle time reaches the limit", () => {
    expect(shouldLock(0, 5 * MINUTE - 1, 5)).toBe(false);
    expect(shouldLock(0, 5 * MINUTE, 5)).toBe(true);
  });

  it("never locks when the limit is zero or negative", () => {
    expect(shouldLock(0, 10_000 * MINUTE, 0)).toBe(false);
    expect(shouldLock(0, 10_000 * MINUTE, -1)).toBe(false);
  });

  it("measures from the last activity", () => {
    expect(shouldLock(4 * MINUTE, 8 * MINUTE, 5)).toBe(false);
    expect(shouldLock(4 * MINUTE, 9 * MINUTE, 5)).toBe(true);
  });
});
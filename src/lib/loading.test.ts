import { describe, expect, it } from "vitest";
import { STALL_MS, isStalled } from "./loading";

describe("isStalled", () => {
  it("is false before the limit and true from the limit on", () => {
    expect(isStalled(1_000, 1_000 + STALL_MS - 1)).toBe(false);
    expect(isStalled(1_000, 1_000 + STALL_MS)).toBe(true);
  });

  it("accepts a custom limit", () => {
    expect(isStalled(0, 499, 500)).toBe(false);
    expect(isStalled(0, 500, 500)).toBe(true);
  });

  it("defaults to ten seconds", () => {
    expect(STALL_MS).toBe(10_000);
  });
});
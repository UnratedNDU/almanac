import { describe, expect, it } from "vitest";
import { INK_DARK, INK_LIGHT, contrastRatio, parseHex, readableInk } from "./color";

describe("color helpers", () => {
  it("parses 3 and 6 digit hex colors", () => {
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(parseHex("#3b5bdb")).toEqual([59, 91, 219]);
  });

  it("rejects anything that is not a hex color", () => {
    for (const bad of ["", "nope", "#12", "#12345", "#gggggg", "rgb(0,0,0)"]) {
      expect(parseHex(bad), bad).toBeNull();
    }
  });

  it("measures contrast like WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("picks the more legible ink for an accent", () => {
    expect(readableInk("#f2d98a")).toBe(INK_DARK);
    expect(readableInk("#1b2a6b")).toBe(INK_LIGHT);
  });
});
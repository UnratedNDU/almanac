import { describe, expect, it } from "vitest";
import { isNewer, parseVersion } from "./version";

describe("parseVersion", () => {
  it("reads three numeric parts, with or without a leading v", () => {
    expect(parseVersion("0.3.0")).toEqual([0, 3, 0]);
    expect(parseVersion("v1.10.2")).toEqual([1, 10, 2]);
  });

  it("rejects anything that is not a plain release version", () => {
    for (const text of ["", "0.3", "v0.3.0-beta.1", "nightly", "1.2.3.4", "a.b.c"]) expect(parseVersion(text)).toBeNull();
  });
});

describe("isNewer", () => {
  it("compares each part as a number, not as text", () => {
    expect(isNewer("0.3.0", "0.2.0")).toBe(true);
    expect(isNewer("0.10.0", "0.9.0")).toBe(true);
    expect(isNewer("1.0.0", "0.99.99")).toBe(true);
    expect(isNewer("v0.2.1", "0.2.0")).toBe(true);
  });

  it("is false for the same or an older version", () => {
    expect(isNewer("0.2.0", "0.2.0")).toBe(false);
    expect(isNewer("0.1.9", "0.2.0")).toBe(false);
  });

  it("is false when either side is not a release version", () => {
    expect(isNewer("nightly", "0.2.0")).toBe(false);
    expect(isNewer("0.3.0", "dev")).toBe(false);
  });
});

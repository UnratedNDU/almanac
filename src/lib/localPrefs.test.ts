// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { markVersionSeen, readPref, writePref } from "./localPrefs";

beforeEach(() => localStorage.clear());

describe("readPref and writePref", () => {
  it("round-trips a value and returns null for an unknown key", () => {
    writePref("almanac.test", "on");
    expect(readPref("almanac.test")).toBe("on");
    expect(readPref("almanac.missing")).toBeNull();
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readPref("x")).toBeNull();
    expect(() => writePref("x", "1")).not.toThrow();
    vi.restoreAllMocks();
  });
});

describe("markVersionSeen", () => {
  it("is quiet on the first run and on the same version", () => {
    expect(markVersionSeen("0.3.0")).toBeNull();
    expect(markVersionSeen("0.3.0")).toBeNull();
  });

  it("returns the version that ran before when the app was updated, once", () => {
    markVersionSeen("0.2.0");
    expect(markVersionSeen("0.4.0")).toBe("0.2.0");
    expect(markVersionSeen("0.4.0")).toBeNull();
  });

  it("is quiet on a downgrade", () => {
    markVersionSeen("0.4.0");
    expect(markVersionSeen("0.3.0")).toBeNull();
  });
});

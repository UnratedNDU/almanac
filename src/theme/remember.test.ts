// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { loadRememberedTheme, rememberTheme } from "./remember";

beforeEach(() => localStorage.clear());

describe("remembered theme", () => {
  it("round-trips theme and accent", () => {
    rememberTheme({ theme: "midnight", accent: "#f2d98a" });
    expect(loadRememberedTheme()).toEqual({ theme: "midnight", accent: "#f2d98a" });
  });

  it("returns nothing when empty or corrupt", () => {
    expect(loadRememberedTheme()).toEqual({});
    localStorage.setItem("almanac.theme", "{not json");
    expect(loadRememberedTheme()).toEqual({});
  });

  it("drops unknown themes and invalid colors", () => {
    localStorage.setItem("almanac.theme", JSON.stringify({ theme: "neon", accent: "red; background: url(x)" }));
    expect(loadRememberedTheme()).toEqual({});
  });
});
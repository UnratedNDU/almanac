// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, type ThemeSettings } from "./applyTheme";
import { PRESETS } from "./presets";
import { INK_DARK } from "../lib/color";

const base: ThemeSettings = { theme: "forest", accent: "", density: "comfortable", fontScale: 1 };
const root = () => document.documentElement;
const cssVar = (name: string) => root().style.getPropertyValue(name);

beforeEach(() => {
  document.head.innerHTML = '<meta name="theme-color" content="#000000">';
  root().removeAttribute("style");
  root().removeAttribute("data-theme");
  root().removeAttribute("data-density");
});

describe("applyTheme", () => {
  it("writes the preset tokens, attributes, color scheme and theme-color", () => {
    applyTheme(base);
    const forest = PRESETS.forest;
    expect(cssVar("--bg")).toBe(forest.tokens.bg);
    expect(cssVar("--accent")).toBe(forest.tokens.accent);
    expect(cssVar("--surface-2")).toBe(forest.tokens.surface2);
    expect(cssVar("color-scheme")).toBe("dark");
    expect(root().dataset.theme).toBe("forest");
    expect(root().dataset.density).toBe("comfortable");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(forest.tokens.bg);
  });

  it("lets a custom accent win and picks a readable ink for it", () => {
    applyTheme({ ...base, accent: "#f2d98a" });
    expect(cssVar("--accent")).toBe("#f2d98a");
    expect(cssVar("--accent-ink")).toBe(INK_DARK);
  });

  it("ignores an invalid accent", () => {
    applyTheme({ ...base, accent: "javascript:alert(1)" });
    expect(cssVar("--accent")).toBe(PRESETS.forest.tokens.accent);
  });

  it("resolves the system theme from the color scheme preference", () => {
    applyTheme({ ...base, theme: "system" }, { prefersDark: true });
    expect(root().dataset.theme).toBe("dark");
    applyTheme({ ...base, theme: "system" }, { prefersDark: false });
    expect(root().dataset.theme).toBe("light");
  });

  it("falls back to light for an unknown theme id", () => {
    applyTheme({ ...base, theme: "neon" as never });
    expect(root().dataset.theme).toBe("light");
  });

  it("clamps the font scale", () => {
    applyTheme({ ...base, fontScale: 9 });
    expect(cssVar("--font-scale")).toBe("1.4");
    applyTheme({ ...base, fontScale: 0.1 });
    expect(cssVar("--font-scale")).toBe("0.85");
    applyTheme({ ...base, fontScale: Number.NaN });
    expect(cssVar("--font-scale")).toBe("1");
  });
});
import { parseHex, readableInk } from "../lib/color";
import type { Settings } from "../types";
import { PRESETS, type PresetId, type TokenName } from "./presets";

export type ThemeSettings = Pick<Settings, "theme" | "accent" | "density" | "fontScale">;

export interface ApplyOptions {
  doc?: Document;
  /** Overrides the system color scheme preference (used by tests). */
  prefersDark?: boolean;
}

const CSS_VARS: Record<TokenName, string> = {
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  ink: "--ink",
  ink2: "--ink-2",
  line: "--line",
  accent: "--accent",
  accentInk: "--accent-ink",
  danger: "--danger",
};

export const FONT_SCALE_RANGE = { min: 0.85, max: 1.4 } as const;

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function resolveTheme(theme: Settings["theme"], prefersDark: boolean): PresetId {
  if (theme === "system") return prefersDark ? "dark" : "light";
  return theme in PRESETS ? theme : "light";
}

/** Writes the theme as CSS variables and attributes on `<html>`. Safe to call repeatedly. */
export function applyTheme(settings: ThemeSettings, options: ApplyOptions = {}): void {
  const doc = options.doc ?? document;
  const id = resolveTheme(settings.theme, options.prefersDark ?? systemPrefersDark());
  const preset = PRESETS[id];
  const tokens = { ...preset.tokens };
  if (parseHex(settings.accent)) {
    tokens.accent = settings.accent;
    tokens.accentInk = readableInk(settings.accent);
  }

  const root = doc.documentElement;
  for (const name of Object.keys(CSS_VARS) as TokenName[]) {
    root.style.setProperty(CSS_VARS[name], tokens[name]);
  }
  const scale = Number.isFinite(settings.fontScale)
    ? Math.min(FONT_SCALE_RANGE.max, Math.max(FONT_SCALE_RANGE.min, settings.fontScale))
    : 1;
  root.style.setProperty("--font-scale", String(scale));
  root.style.setProperty("color-scheme", preset.scheme);
  root.dataset.theme = id;
  root.dataset.density = settings.density;
  doc.querySelector('meta[name="theme-color"]')?.setAttribute("content", tokens.bg);
}
import { parseHex } from "../lib/color";
import type { ThemeSettings } from "./applyTheme";
import { PRESETS } from "./presets";

const KEY = "almanac.theme";

type Remembered = Pick<ThemeSettings, "theme" | "accent">;

/** The real settings are encrypted, so the lock screen borrows the last theme from plain local storage. */
export function rememberTheme({ theme, accent }: Remembered): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme, accent }));
  } catch {
    // Storage can be blocked or full; the lock screen just uses the system theme.
  }
}

export function loadRememberedTheme(): Partial<Remembered> {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Remembered> | null;
    const out: Partial<Remembered> = {};
    if (value && (value.theme === "system" || (typeof value.theme === "string" && value.theme in PRESETS))) {
      out.theme = value.theme;
    }
    if (typeof value?.accent === "string" && parseHex(value.accent)) out.accent = value.accent;
    return out;
  } catch {
    return {};
  }
}
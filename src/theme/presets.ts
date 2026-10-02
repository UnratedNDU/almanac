import type { ThemeId } from "../types";

export type TokenName = "bg" | "surface" | "surface2" | "ink" | "ink2" | "line" | "accent" | "accentInk" | "danger";

export type PresetId = Exclude<ThemeId, "system">;

export interface Preset {
  label: string;
  scheme: "light" | "dark";
  tokens: Record<TokenName, string>;
}

/** The single source of truth for theme colors; `applyTheme` writes them as CSS variables. */
export const PRESETS: Record<PresetId, Preset> = {
  light: {
    label: "Claro",
    scheme: "light",
    tokens: {
      bg: "#f3f5f8", surface: "#ffffff", surface2: "#e9edf3", ink: "#151a24", ink2: "#566074",
      line: "#dde2ea", accent: "#3b5bdb", accentInk: "#ffffff", danger: "#c0362c",
    },
  },
  dark: {
    label: "Oscuro",
    scheme: "dark",
    tokens: {
      bg: "#101318", surface: "#181c23", surface2: "#212631", ink: "#e9ecf2", ink2: "#9aa3b5",
      line: "#2a303c", accent: "#8ea2ff", accentInk: "#0b1020", danger: "#ff7b72",
    },
  },
  midnight: {
    label: "Medianoche",
    scheme: "dark",
    tokens: {
      bg: "#070b18", surface: "#0e1530", surface2: "#16204a", ink: "#eaf0ff", ink2: "#9fb0dd",
      line: "#1e2a5a", accent: "#f2d98a", accentInk: "#1a1500", danger: "#ff8a80",
    },
  },
  forest: {
    label: "Bosque",
    scheme: "dark",
    tokens: {
      bg: "#0d1712", surface: "#14231b", surface2: "#1c3025", ink: "#e6f1e8", ink2: "#9db8a6",
      line: "#234032", accent: "#7fd6a0", accentInk: "#04150b", danger: "#ff8f85",
    },
  },
  sunset: {
    label: "Atardecer",
    scheme: "dark",
    tokens: {
      bg: "#1c1220", surface: "#271a2d", surface2: "#35233d", ink: "#fbeee8", ink2: "#c9a9b8",
      line: "#432d4a", accent: "#ff9b7b", accentInk: "#2a0e06", danger: "#ff7d7d",
    },
  },
  paper: {
    label: "Papel",
    scheme: "light",
    tokens: {
      bg: "#efe8d8", surface: "#f8f3e6", surface2: "#e6ddc9", ink: "#2b2418", ink2: "#6b5f48",
      line: "#d8ccb2", accent: "#1f6f5c", accentInk: "#f8f3e6", danger: "#b3261e",
    },
  },
};

/** Display order in the theme picker. */
export const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
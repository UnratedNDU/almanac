import { useEffect } from "react";
import { applyTheme, type ThemeSettings } from "./applyTheme";
import { rememberTheme } from "./remember";

/** Keeps `<html>` in sync with the settings, following the OS when the theme is "system". */
export function useTheme({ theme, accent, density, fontScale }: ThemeSettings): void {
  useEffect(() => {
    const settings = { theme, accent, density, fontScale };
    applyTheme(settings);
    rememberTheme(settings);
    if (theme !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const refresh = () => applyTheme(settings);
    query.addEventListener("change", refresh);
    return () => query.removeEventListener("change", refresh);
  }, [theme, accent, density, fontScale]);
}
import { describe, expect, it } from "vitest";
import { contrastRatio, parseHex } from "../lib/color";
import { PRESETS, PRESET_IDS, type TokenName } from "./presets";

const TOKENS: TokenName[] = ["bg", "surface", "surface2", "ink", "ink2", "line", "accent", "accentInk", "danger"];

describe.each(PRESET_IDS)("preset %s", (id) => {
  const { scheme, tokens } = PRESETS[id];

  it("defines every token as a hex color", () => {
    for (const name of TOKENS) expect(parseHex(tokens[name]), name).not.toBeNull();
  });

  it("keeps text readable (WCAG AA or better)", () => {
    expect(contrastRatio(tokens.ink, tokens.bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(tokens.ink, tokens.surface)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(tokens.ink2, tokens.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.ink2, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.danger, tokens.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens.accentInk, tokens.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the accent visible against surfaces (non-text contrast)", () => {
    expect(contrastRatio(tokens.accent, tokens.surface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(tokens.accent, tokens.bg)).toBeGreaterThanOrEqual(3);
  });

  it("declares a color scheme that matches its background", () => {
    const light = contrastRatio(tokens.bg, "#ffffff") < contrastRatio(tokens.bg, "#000000");
    expect(scheme).toBe(light ? "light" : "dark");
  });
});
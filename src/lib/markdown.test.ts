import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline } from "./markdown";

describe("parseBlocks", () => {
  it("reads headings, paragraphs and list items, one block per line", () => {
    const text = "## Almanac v0.2.0\n\nPrimeras observaciones.\n\n### Novedades\n- **Selector**: pulsa el título\n* Otro cambio\n";
    expect(parseBlocks(text)).toEqual([
      { kind: "heading", level: 2, text: "Almanac v0.2.0" },
      { kind: "paragraph", text: "Primeras observaciones." },
      { kind: "heading", level: 3, text: "Novedades" },
      { kind: "item", text: "**Selector**: pulsa el título" },
      { kind: "item", text: "Otro cambio" },
    ]);
  });

  it("copes with Windows line endings and blank input", () => {
    expect(parseBlocks("### A\r\n- b\r\n")).toEqual([
      { kind: "heading", level: 3, text: "A" },
      { kind: "item", text: "b" },
    ]);
    expect(parseBlocks("")).toEqual([]);
  });
});

describe("parseInline", () => {
  it("splits bold and code spans from plain text", () => {
    expect(parseInline("Usa **negrita** y `código` aquí")).toEqual([
      { text: "Usa " },
      { text: "negrita", style: "bold" },
      { text: " y " },
      { text: "código", style: "code" },
      { text: " aquí" },
    ]);
  });

  it("leaves unclosed markers as plain text", () => {
    expect(parseInline("**sin cerrar")).toEqual([{ text: "**sin cerrar" }]);
    expect(parseInline("")).toEqual([]);
  });

  it("never produces markup: angle brackets stay literal text", () => {
    expect(parseInline("<b>x</b>")).toEqual([{ text: "<b>x</b>" }]);
  });
});

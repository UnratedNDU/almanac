import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { entriesSince, parseChangelog } from "./changelog";

const SAMPLE = `# Changelog

Formato basado en Keep a Changelog.

## [Sin publicar]

## [0.2.0] - 2026-10-02

Primeras observaciones.

### Añadido
- Selector de mes.

## [0.1.0] - 2026-10-01

Primera versión.
`;

describe("parseChangelog", () => {
  it("returns the released versions, newest first, with their date and notes", () => {
    expect(parseChangelog(SAMPLE)).toEqual([
      { version: "0.2.0", date: "2026-10-02", body: "Primeras observaciones.\n\n### Añadido\n- Selector de mes." },
      { version: "0.1.0", date: "2026-10-01", body: "Primera versión." },
    ]);
  });

  it("skips the unreleased section and anything without notes", () => {
    expect(parseChangelog("## [Sin publicar]\n\n## [0.1.0] - 2026-10-01\n")).toEqual([]);
  });

  it("works with Windows line endings", () => {
    expect(parseChangelog(SAMPLE.replace(/\n/g, "\r\n")).map((entry) => entry.version)).toEqual(["0.2.0", "0.1.0"]);
  });

  it("reads the real changelog of this repository", async () => {
    const real = (await import("../../CHANGELOG.md?raw")).default;
    const entries = parseChangelog(real);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => /^\d+\.\d+\.\d+$/.test(entry.version) && entry.body.length > 0)).toBe(true);
  });

  it("starts with the version in package.json, so a release cannot forget its changelog entry (the app bundles it)", async () => {
    const real = (await import("../../CHANGELOG.md?raw")).default;
    expect(parseChangelog(real)[0].version).toBe(pkg.version);
  });
});

describe("entriesSince", () => {
  const entries = parseChangelog(SAMPLE);

  it("keeps only the versions after the one the user had", () => {
    expect(entriesSince(entries, "0.1.0").map((entry) => entry.version)).toEqual(["0.2.0"]);
    expect(entriesSince(entries, "0.2.0")).toEqual([]);
  });

  it("returns everything when there is no previous version", () => {
    expect(entriesSince(entries, null)).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import { layoutOverlaps } from "./layout";

const at = (id: string, startMin: number, endMin: number) => ({ id, startMin, endMin });
const byId = (placed: ReturnType<typeof layoutOverlaps>) => Object.fromEntries(placed.map((p) => [p.id, p]));

describe("layoutOverlaps", () => {
  it("gives separate events the full width", () => {
    const p = byId(layoutOverlaps([at("a", 60, 120), at("b", 120, 180)]));
    expect(p.a).toMatchObject({ col: 0, cols: 1 });
    expect(p.b).toMatchObject({ col: 0, cols: 1 });
  });

  it("splits two overlapping events into two columns", () => {
    const p = byId(layoutOverlaps([at("a", 60, 150), at("b", 120, 180)]));
    expect(p.a.cols).toBe(2);
    expect(p.b.cols).toBe(2);
    expect(p.a.col).not.toBe(p.b.col);
  });

  it("reuses a column inside a chain and sizes the whole cluster alike", () => {
    // a overlaps b, b overlaps c, but a and c do not overlap.
    const p = byId(layoutOverlaps([at("a", 0, 60), at("b", 30, 90), at("c", 60, 120)]));
    expect(p.a).toMatchObject({ col: 0, cols: 2 });
    expect(p.b).toMatchObject({ col: 1, cols: 2 });
    expect(p.c).toMatchObject({ col: 0, cols: 2 });
  });

  it("uses three columns for three mutual overlaps", () => {
    const p = layoutOverlaps([at("a", 0, 100), at("b", 10, 100), at("c", 20, 100)]);
    expect(new Set(p.map((x) => x.col)).size).toBe(3);
    expect(p.every((x) => x.cols === 3)).toBe(true);
  });

  it("handles an empty list and keeps ids", () => {
    expect(layoutOverlaps([])).toEqual([]);
    expect(layoutOverlaps([at("only", 5, 10)]).map((x) => x.id)).toEqual(["only"]);
  });
});
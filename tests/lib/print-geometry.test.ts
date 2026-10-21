import { describe, expect, it } from "vitest";
import { impose, placementInsideSheet } from "../../lib/print/impose";
import { PRINT_TEMPLATES, SHEETS, sheetById, templateById } from "../../lib/print/templates";
import { bleedBox, inToMm, mmToPt, safeBox, safeInsetMm } from "../../lib/print/units";

describe("millimetres and points", () => {
  it("converts 1 inch to 72 points", () => {
    expect(mmToPt(inToMm(1))).toBeCloseTo(72, 8);
    expect(mmToPt(25.4)).toBeCloseTo(72, 8);
  });

  it("converts a CR80 width to points", () => {
    expect(mmToPt(85.6)).toBeCloseTo((85.6 * 72) / 25.4, 8);
  });

  it("adds 3 mm bleed on every edge", () => {
    expect(bleedBox(85.6, 54)).toEqual({ bleedMm: 3, widthMm: 91.6, heightMm: 60 });
  });

  it("insets the safe zone, with a tighter keychain", () => {
    expect(safeInsetMm("cr80")).toBe(4);
    expect(safeInsetMm("keychain")).toBe(2);
    expect(safeBox(85.6, 54, 4)).toEqual({ x: 4, y: 4, widthMm: 77.6, heightMm: 46 });
    expect(safeBox(30, 50, 2).widthMm).toBe(26);
  });
});

describe("print templates", () => {
  it("lists the fourteen physical sizes", () => {
    expect(PRINT_TEMPLATES.map((item) => item.id)).toEqual([
      "cr80",
      "tent-a6",
      "tent-a5",
      "standee-4x6",
      "standee-5x7",
      "round-50",
      "round-75",
      "square-60",
      "square-100",
      "poster-a4",
      "poster-a3",
      "bill-strip",
      "keychain",
      "door"
    ]);
  });

  it("keeps the card as two faces and the stickers round", () => {
    expect(templateById("cr80")).toMatchObject({ widthMm: 85.6, heightMm: 54, faces: 2, kind: "CARD" });
    expect(templateById("round-50")).toMatchObject({ shape: "round", widthMm: 50, heightMm: 50, kind: "STICKER" });
    expect(templateById("keychain")).toMatchObject({ widthMm: 30, heightMm: 50, kind: "KEYCHAIN", safeMm: 2 });
    expect(templateById("standee-4x6")?.widthMm).toBeCloseTo(101.6, 8);
    expect(templateById("door")).toMatchObject({ widthMm: 120, heightMm: 180, kind: "STICKER" });
    expect(templateById("bill-strip")?.kind).toBe("STANDEE");
  });
});

describe("imposition", () => {
  it("fits 10 CR80 cards on A4 as 2 by 5", () => {
    const card = templateById("cr80")!;
    const a4 = sheetById("a4")!;
    const layout = impose({
      itemWidthMm: card.widthMm,
      itemHeightMm: card.heightMm,
      sheetWidthMm: a4.widthMm,
      sheetHeightMm: a4.heightMm
    });
    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(5);
    expect(layout.count).toBe(10);
    expect(layout.placements.every((box) => placementInsideSheet(box, a4.widthMm, a4.heightMm))).toBe(true);
    expect(layout.cutMarks.length).toBeGreaterThan(0);
  });

  it("fits 4 A6 tents on A4 as 2 by 2", () => {
    const tent = templateById("tent-a6")!;
    const a4 = sheetById("a4")!;
    const layout = impose({
      itemWidthMm: tent.widthMm,
      itemHeightMm: tent.heightMm,
      sheetWidthMm: a4.widthMm,
      sheetHeightMm: a4.heightMm
    });
    expect(layout).toMatchObject({ columns: 2, rows: 2, count: 4 });
    expect(layout.placements.every((box) => placementInsideSheet(box, a4.widthMm, a4.heightMm))).toBe(true);
  });

  it("keeps CR80 placements inside SRA3 and 12×18 in", () => {
    const card = templateById("cr80")!;
    for (const id of ["sra3", "12x18"] as const) {
      const sheet = sheetById(id)!;
      const layout = impose({
        itemWidthMm: card.widthMm,
        itemHeightMm: card.heightMm,
        sheetWidthMm: sheet.widthMm,
        sheetHeightMm: sheet.heightMm
      });
      expect(layout.count).toBeGreaterThan(10);
      expect(layout.placements.every((box) => placementInsideSheet(box, sheet.widthMm, sheet.heightMm))).toBe(true);
      expect(sheetById("12x18")).toMatchObject({ widthMm: 304.8, heightMm: 457.2 });
    }
  });

  it("does not draw a cut mark across another card", () => {
    const card = templateById("cr80")!;
    const a4 = SHEETS[0];
    const layout = impose({
      itemWidthMm: card.widthMm,
      itemHeightMm: card.heightMm,
      sheetWidthMm: a4.widthMm,
      sheetHeightMm: a4.heightMm
    });
    for (const mark of layout.cutMarks) {
      const x = (mark.x1 + mark.x2) / 2;
      const y = (mark.y1 + mark.y2) / 2;
      const hits = layout.placements.some(
        (box) => x > box.x && x < box.x + box.widthMm && y > box.y && y < box.y + box.heightMm
      );
      expect(hits).toBe(false);
    }
  });
});

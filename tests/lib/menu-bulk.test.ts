import { describe, expect, it } from "vitest";
import { BULK_COLUMNS, parseCsv, rowsFromTable, templateCsv } from "../../lib/store/entry";
import {
  buildBulkPreview, csvForRows, defaultBulkAction, demoRowsForBusiness, parseBulkFile,
  validateBulkRow, xlsxForRows
} from "../../lib/store/bulk";
import { assertSafeOutboundUrl } from "../../lib/ssrf";

describe("bulk menu files and preview", () => {
  it.each([
    ["cafe", "Masala chai"],
    ["restaurant", "Masala chai"],
    ["salon", "Haircut"],
    ["kirana", "Basmati rice 1 kg"],
    ["general store", "Basmati rice 1 kg"]
  ])("creates an importable %s demo", async (industry, expected) => {
    const rows = demoRowsForBusiness(industry);
    expect(rows).toHaveLength(8);
    expect(rows.some((row) => row.name === expected)).toBe(true);
    const file = Buffer.from(csvForRows(rows), "utf8");
    const imported = await parseBulkFile(file, "demo.csv");
    expect(imported).toHaveLength(8);
    expect(imported.flatMap((row) => validateBulkRow(row).errors)).toEqual([]);
  });

  it("includes Products and bilingual notes sheets in Excel files", async () => {
    const rows = demoRowsForBusiness("salon");
    const bytes = await xlsxForRows(rows, true);
    const parsed = await parseBulkFile(bytes, "salon-demo.xlsx");
    expect(parsed).toHaveLength(8);
    expect(parsed[0].name).toBe("Haircut");
  });

  it("keeps the blank CSV BOM and Hindi values round-trip", () => {
    const blank = templateCsv();
    expect(blank.charCodeAt(0)).toBe(0xfeff);
    expect(blank).toContain("name,price,mrp,category,hindi_name");
    expect(blank).toContain("हिंदी");
    expect(parseCsv(blank)).toEqual([]);
    const demo = parseCsv(csvForRows(demoRowsForBusiness("cafe")));
    expect(demo.find((row) => row.name === "Masala chai")?.nameHi).toBe("मसाला चाय");
  });

  it("still reads the old eight-column header and headerless rows", () => {
    const old = rowsFromTable([
      ["name", "price", "category", "Hindi name", "description", "veg", "brand", "MRP"],
      ["Filter coffee", "80", "Coffee", "फ़िल्टर कॉफ़ी", "South Indian", "VEG", "", ""]
    ]);
    expect(old[0]).toMatchObject({ name: "Filter coffee", nameHi: "फ़िल्टर कॉफ़ी", veg: "VEG" });
    const headerless = rowsFromTable([["Tea", "40", "Drinks", "चाय", "Hot tea", "VEG", "", ""]]);
    expect(headerless[0]).toMatchObject({ name: "Tea", price: "40", nameHi: "चाय" });
    expect(BULK_COLUMNS).toHaveLength(13);
  });

  it("returns per-row validation, duplicate, existing-item and plan-limit details", () => {
    const rows = demoRowsForBusiness("kirana");
    rows[1] = { ...rows[1], name: rows[0].name, veg: "SPICY" };
    const preview = buildBulkPreview(rows, [{ id: "old", name: "Toothpaste 150 g", barcode: "890100000008" }], 3, 5, ["Grocery"]);
    expect(preview.rows[1].warnings).toContain("Duplicate name in this file");
    expect(preview.rows.at(-1)?.matchedItemId).toBe("old");
    expect(preview.rows[1].errors).toContain("Veg must be VEG, NON_VEG, EGG, or blank");
    expect(preview.newCategories).not.toContain("Grocery");
    expect(preview.limit.remaining).toBe(2);
    expect(defaultBulkAction(true, false, "add_new")).toBe("skip");
    expect(defaultBulkAction(true, false, "update_existing")).toBe("update");
    expect(defaultBulkAction(false, true, "update_existing")).toBe("skip");

    const room = buildBulkPreview(demoRowsForBusiness("cafe"), [], 3, 5);
    expect(room.limit.additions).toBe(8);
    expect(room.limit.fits).toBe(2);
    const duplicates = buildBulkPreview(rows.map((row) => ({ ...row, name: "Existing item" })), [{ id: "one", name: "Existing item", barcode: "" }], 5, 5);
    expect(duplicates.limit.fits).toBe(1);
  });

  it("rejects a photo URL that points at a private address", async () => {
    await expect(assertSafeOutboundUrl("https://127.0.0.1/private.png")).rejects.toThrow(/private|reserved/i);
  });
});

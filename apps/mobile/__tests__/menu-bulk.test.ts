import { arrayBufferToBase64, bulkResultCopy, mapBulkPreview, menuBulkFileSpec } from "../src/store/menu-bulk";

describe("mobile menu bulk helpers", () => {
  it("maps preview rows and plan counts without losing row choices", () => {
    const result = mapBulkPreview({
      rows: [{ index: 2, row: { name: "Tea", price: "30", nameHi: "चाय" }, errors: ["Missing name"], warnings: ["Duplicate name in this file"], matchedItemId: "item-1", action: "skip" }],
      newCategories: ["Drinks"],
      limit: { used: 4, cap: 10, remaining: 6, additions: 1, fits: 2 }
    });
    expect(result.rows[0]).toMatchObject({ index: 2, row: { name: "Tea", nameHi: "चाय" }, errors: ["Missing name"], matchedItemId: "item-1", action: "skip" });
    expect(result.limit.fits).toBe(2);
    expect(result.newCategories).toEqual(["Drinks"]);
  });

  it("builds the authenticated template and demo download paths", () => {
    expect(menuBulkFileSpec("biz/a", "demo", "xlsx")).toMatchObject({
      path: "/api/v1/businesses/biz%2Fa/menu/sheet?format=xlsx&kind=demo",
      filename: "qr24x7-items-demo.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    expect(arrayBufferToBase64(new TextEncoder().encode("हिंदी").buffer)).toBe(Buffer.from("हिंदी", "utf8").toString("base64"));
  });

  it("summarizes results and no-photo count in both app languages", () => {
    const result = { created: 8, updated: 1, skipped: 2, failed: 0, noPhoto: 7 };
    expect(bulkResultCopy(result, "en")).toContain("7 items have no photo");
    expect(bulkResultCopy(result, "hi")).toContain("7 आइटम में फ़ोटो नहीं है");
  });
});

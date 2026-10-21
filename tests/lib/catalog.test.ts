import { describe, expect, it } from "vitest";
import { catalogVariantError, isLowStock } from "../../lib/shop/catalog";
import { CATALOG_SEED, CATALOG_SKUS } from "../../lib/shop/catalog-seed";

describe("catalogue seed", () => {
  it("ships the hardware SKUs with valid prices, tax, and boxes", () => {
    const skus = CATALOG_SEED.flatMap((row) => row.variants.map((variant) => variant.sku));
    expect(skus).toEqual(CATALOG_SKUS);
    for (const row of CATALOG_SEED) {
      expect(row.product.descriptionHi).toBeTruthy();
      for (const variant of row.variants) {
        expect(catalogVariantError(variant)).toBeNull();
        expect(variant.salePaise).toBeLessThanOrEqual(variant.mrpPaise);
      }
    }
    const combo = CATALOG_SEED.find((row) => row.product.slug === "nfc-qr-combo");
    expect(combo?.product.needsNfc).toBe(true);
    const stickers = CATALOG_SEED.find((row) => row.product.slug === "table-stickers");
    expect(stickers?.variants.map((variant) => variant.sku)).toEqual(["STICK-5", "STICK-10"]);
  });

  it("rejects a sale price above MRP and flags low stock", () => {
    const sample = CATALOG_SEED[0].variants[0];
    expect(catalogVariantError({ ...sample, salePaise: sample.mrpPaise + 1 })).toMatch(/MRP/);
    expect(catalogVariantError({ ...sample, minQty: 0 })).toMatch(/Minimum/);
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
  });

  it("allows a zero box only when the variant does not ship", () => {
    const sample = CATALOG_SEED[0].variants[0];
    expect(catalogVariantError({ ...sample, weightGrams: 0 })).toMatch(/Weight/);
    expect(
      catalogVariantError({ ...sample, weightGrams: 0, lengthMm: 0, widthMm: 0, heightMm: 0, ships: false })
    ).toBeNull();
  });
});

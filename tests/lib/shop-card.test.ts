import { describe, expect, it } from "vitest";
import { artKind, cartUnits, hasOptions, offPercent } from "../../lib/shop/card";
import { CATALOG_SEED, FOUNDER_SEED } from "../../lib/shop/catalog-seed";
import { shopCopy } from "../../lib/shop/i18n";

describe("shop card helpers", () => {
  it("rounds the percent off and hides it when there is no discount", () => {
    expect(offPercent(99900, 79900)).toBe(20);
    expect(offPercent(79900, 79900)).toBe(0);
    expect(offPercent(0, 0)).toBe(0);
    expect(offPercent(50000, 60000)).toBe(0);
  });

  it("opens the Choose sheet only for products with more than one variant", () => {
    const bySlug = new Map(CATALOG_SEED.map((seed) => [seed.product.slug, seed.variants]));
    expect(hasOptions({ variants: bySlug.get("table-stickers")! })).toBe(true);
    expect(hasOptions({ variants: bySlug.get("qr-stand")! })).toBe(false);
    expect(hasOptions({ variants: FOUNDER_SEED.variants })).toBe(false);
  });

  it("draws a preview for every seeded product", () => {
    const kinds = Object.fromEntries(
      [...CATALOG_SEED, FOUNDER_SEED].map((seed) => [
        seed.product.slug,
        artKind({ ...seed.product, defaultTemplateId: seed.product.defaultTemplateId ?? null, ships: seed.variants[0]?.ships !== false })
      ])
    );
    expect(kinds).toEqual({
      "qr-stand": "stand",
      "nfc-qr-combo": "combo",
      "pvc-nfc-card": "card",
      "table-stickers": "sticker",
      "keychain-tag": "keychain",
      "founder-lifetime": "plan"
    });
    expect(artKind({ needsDesign: true, needsNfc: false, ships: true, defaultTemplateId: "tent-a6" })).toBe("tent");
  });

  it("counts cart units across lines", () => {
    expect(cartUnits([{ qty: 2 }, { qty: 5 }])).toBe(7);
    expect(cartUnits([])).toBe(0);
  });

  it("has the card strings in English and Hindi", () => {
    for (const key of ["choose", "added", "adding", "addFailed", "chooseOption", "designInCart", "viewCart", "items", "yourBusiness", "artTagline", "artLifetime"] as const) {
      expect(shopCopy("en")[key]).toBeTruthy();
      expect(shopCopy("hi")[key]).toBeTruthy();
      expect(shopCopy("hi")[key]).not.toBe(shopCopy("en")[key]);
    }
  });
});

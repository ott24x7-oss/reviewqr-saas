import { describe, expect, it } from "vitest";
import { priceAnchor } from "@/lib/landing/anchor";

describe("priceAnchor", () => {
  it("uses the cheapest real monthly price", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "MONTH_1", pricePaise: 49900 }, { duration: "YEAR_1", pricePaise: 100 }] },
      { prices: [{ duration: "MONTH_1", pricePaise: 29900 }] }
    ]);
    expect(anchor).toEqual({ paise: 29900, duration: "MONTH_1", perMonth: true });
  });

  it("does not invent a monthly price when no plan has one", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "YEAR_1", pricePaise: 499000 }] },
      { prices: [{ duration: "LIFETIME", pricePaise: 999000 }] }
    ]);
    expect(anchor).toEqual({ paise: 499000, duration: "YEAR_1", perMonth: false });
  });

  it("returns null when nothing is priced", () => {
    expect(priceAnchor([{ prices: [] }])).toBeNull();
  });
});

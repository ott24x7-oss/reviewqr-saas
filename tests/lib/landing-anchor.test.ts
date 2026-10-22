import { describe, expect, it } from "vitest";
import { freePlanOffer, priceAnchor } from "@/lib/landing/anchor";

describe("priceAnchor", () => {
  it("uses the cheapest paid monthly price", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "MONTH_1", pricePaise: 49900 }, { duration: "YEAR_1", pricePaise: 499000 }] },
      { prices: [{ duration: "MONTH_1", pricePaise: 29900 }] }
    ]);
    expect(anchor).toEqual({ paise: 29900, duration: "MONTH_1", perMonth: true });
  });

  it("never picks a free plan when a paid plan exists", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "MONTH_1", pricePaise: 0 }, { duration: "YEAR_1", pricePaise: 0 }] },
      { prices: [{ duration: "MONTH_1", pricePaise: 49900 }] }
    ]);
    expect(anchor).toEqual({ paise: 49900, duration: "MONTH_1", perMonth: true });
  });

  it("turns a yearly price into its monthly equivalent", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "YEAR_1", pricePaise: 499000 }] },
      { prices: [{ duration: "LIFETIME", pricePaise: 999000 }] }
    ]);
    expect(anchor).toEqual({ paise: Math.round(499000 / 12), duration: "YEAR_1", perMonth: true });
  });

  it("uses a six-month price divided by six when that is cheaper", () => {
    const anchor = priceAnchor([
      { prices: [{ duration: "MONTH_1", pricePaise: 49900 }, { duration: "MONTH_6", pricePaise: 240000 }] }
    ]);
    expect(anchor).toEqual({ paise: 40000, duration: "MONTH_6", perMonth: true });
  });

  it("returns null when the only prices are free or lifetime", () => {
    expect(priceAnchor([{ prices: [{ duration: "MONTH_1", pricePaise: 0 }] }])).toBeNull();
    expect(priceAnchor([{ prices: [{ duration: "LIFETIME", pricePaise: 999000 }] }])).toBeNull();
    expect(priceAnchor([{ prices: [] }])).toBeNull();
  });

  it("reports a free plan separately from the anchor", () => {
    const plans = [
      { slug: "free", prices: [{ duration: "MONTH_1" as const, pricePaise: 0 }] },
      { slug: "starter", prices: [{ duration: "MONTH_1" as const, pricePaise: 49900 }] }
    ];
    expect(freePlanOffer(plans)).toEqual({ slug: "free", duration: "MONTH_1" });
    expect(priceAnchor(plans)?.paise).toBe(49900);
  });
});

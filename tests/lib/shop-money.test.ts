import { describe, expect, it } from "vitest";
import { catalogVariantError } from "../../lib/shop/catalog";
import { FOUNDER_CAP, FOUNDER_SALE_PAISE, FOUNDER_SEED, FOUNDER_SKU } from "../../lib/shop/catalog-seed";
import { addressError, sameSupplyState } from "../../lib/shop/address";
import { bundleGrant, founderCapAllows } from "../../lib/shop/bundle";
import { quoteShop } from "../../lib/shop/quote";
import { extendSubscriptionEnd } from "../../lib/subscription";
import { effectiveTier } from "../../lib/payments";
import { DEFAULT_PLANS } from "../../lib/settings";

const line = {
  sku: "STAND-QR",
  qty: 1,
  unitPaise: 11800,
  gstPercent: 18,
  stock: 10,
  minQty: 1
};

describe("shop GST quote", () => {
  it("splits an inclusive price into CGST and SGST in the seller state", () => {
    const quote = quoteShop({ lines: [line], sameState: true });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.totalPaise).toBe(11800);
    expect(quote.taxablePaise).toBe(10000);
    expect(quote.cgstPaise).toBe(900);
    expect(quote.sgstPaise).toBe(900);
    expect(quote.igstPaise).toBe(0);
  });

  it("uses IGST when the buyer is in another state", () => {
    const quote = quoteShop({ lines: [line], sameState: false });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.igstPaise).toBe(1800);
    expect(quote.cgstPaise).toBe(0);
    expect(quote.sgstPaise).toBe(0);
  });

  it("applies a coupon, then a referral on the remainder, and shares the discount", () => {
    const quote = quoteShop({
      lines: [
        line,
        { sku: "CARD", qty: 1, unitPaise: 50000, gstPercent: 12, stock: 5, minQty: 1 }
      ],
      coupon: { percentOff: 10, flatPaise: 500, active: true },
      referral: { flatPaise: 1000, active: true },
      sameState: true
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    expect(quote.subtotalPaise).toBe(61800);
    expect(quote.couponPaise).toBe(6180);
    expect(quote.referralPaise).toBe(1000);
    expect(quote.discountPaise).toBe(7180);
    expect(quote.totalPaise).toBe(54620);
    expect(quote.lines[0].discountPaise).toBe(1370);
    expect(quote.lines[1].discountPaise).toBe(5810);
    expect(quote.lines[0].netPaise).toBe(10430);
    expect(quote.lines[0].taxablePaise).toBe(8839);
    expect(quote.lines[0].cgstPaise).toBe(795);
    expect(quote.lines[0].sgstPaise).toBe(796);
  });

  it("rejects an inactive or expired coupon without discounting the order", () => {
    const inactive = quoteShop({
      lines: [line],
      coupon: { percentOff: 50, active: false },
      sameState: true
    });
    const expired = quoteShop({
      lines: [line],
      coupon: { percentOff: 50, active: true, expiresAt: new Date("2020-01-01T00:00:00Z") },
      sameState: true,
      now: new Date("2026-04-01T00:00:00Z")
    });
    expect(inactive.ok && inactive.couponRejected && inactive.couponPaise).toBe(0);
    expect(inactive.ok && inactive.totalPaise).toBe(11800);
    expect(expired.ok && expired.couponRejected && expired.totalPaise).toBe(11800);
  });

  it("rejects a quantity below the minimum, above stock, or past the Founder cap", () => {
    expect(quoteShop({ lines: [{ ...line, qty: 1, minQty: 2 }], sameState: true })).toMatchObject({
      ok: false,
      error: expect.stringMatching(/minimum/i)
    });
    expect(quoteShop({ lines: [{ ...line, qty: 3, stock: 2 }], sameState: true })).toMatchObject({
      ok: false,
      error: "Not enough stock"
    });
    expect(
      quoteShop({
        lines: [{ ...line, sku: FOUNDER_SKU, qty: 1, stock: 0, includedLifetime: true }],
        sameState: true
      })
    ).toMatchObject({ ok: false, error: "Founder lifetime is sold out" });
    expect(founderCapAllows(FOUNDER_CAP, 1)).toBe(true);
    expect(founderCapAllows(FOUNDER_CAP, FOUNDER_CAP + 1)).toBe(false);
    expect(founderCapAllows(0, 1)).toBe(false);
  });
});

describe("bundled plans", () => {
  it("keeps the published plan prices and hides Founder", () => {
    expect(DEFAULT_PLANS.STARTER.monthly).toBe(49900);
    expect(DEFAULT_PLANS.STARTER.yearly).toBe(499900);
    expect(DEFAULT_PLANS.GROWTH.monthly).toBe(99900);
    expect(DEFAULT_PLANS.GROWTH.yearly).toBe(999900);
    expect(DEFAULT_PLANS.AGENCY.monthly).toBe(299900);
    expect(DEFAULT_PLANS.AGENCY.yearly).toBe(2999900);
    expect(DEFAULT_PLANS.FOUNDER.monthly).toBe(0);
    expect(DEFAULT_PLANS.FOUNDER.yearly).toBe(0);
    expect(DEFAULT_PLANS.FOUNDER.visible).toBe(false);
    expect(DEFAULT_PLANS.FOUNDER.limits).toEqual(DEFAULT_PLANS.GROWTH.limits);
  });

  it("seeds one capped Founder SKU that does not ship", () => {
    const variant = FOUNDER_SEED.variants[0];
    expect(variant.sku).toBe(FOUNDER_SKU);
    expect(variant.salePaise).toBe(FOUNDER_SALE_PAISE);
    expect(variant.stock).toBe(FOUNDER_CAP);
    expect(variant.ships).toBe(false);
    expect(variant.includedLifetime).toBe(true);
    expect(variant.includedTier).toBe("FOUNDER");
    expect(catalogVariantError(variant)).toBeNull();
    expect(FOUNDER_SEED.product.needsDesign).toBe(false);
  });

  it("grants Founder for life, or 6 months from the later end date", () => {
    const life = bundleGrant({ includedLifetime: true, includedTier: "FOUNDER" }, new Date("2026-06-01T00:00:00Z"));
    expect(life).toEqual({ ok: true, tier: "FOUNDER", lifetime: true, months: 0, endsAt: null });

    const now = new Date("2026-01-15T00:00:00Z");
    const currentEnd = new Date("2026-03-01T00:00:00Z");
    const months = bundleGrant({ includedTier: "GROWTH", includedMonths: 6 }, currentEnd, now);
    expect(months.ok).toBe(true);
    if (!months.ok || months.tier == null || months.lifetime) return;
    expect(months.months).toBe(6);
    expect(months.endsAt).toEqual(extendSubscriptionEnd(currentEnd, 6, now));

    expect(bundleGrant({ includedTier: "STARTER", includedMonths: 3 }, null, now).ok).toBe(false);
    expect(bundleGrant({ includedTier: "STARTER" }, null, now).ok).toBe(false);
  });

  it("does not let a past end date revoke an active Founder", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const future = new Date("2099-01-01T00:00:00Z");
    expect(
      effectiveTier({
        subscriptionTier: "FOUNDER",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        subscriptionEndsAt: past
      })
    ).toBe("FOUNDER");
    expect(
      effectiveTier({
        subscriptionTier: "FOUNDER",
        subscriptionStatus: "CANCELED",
        trialEndsAt: null,
        subscriptionEndsAt: null
      })
    ).toBe("FREE");
    expect(
      effectiveTier({
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        subscriptionEndsAt: past
      })
    ).toBe("FREE");
    expect(
      effectiveTier({
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: null,
        subscriptionEndsAt: future
      })
    ).toBe("STARTER");
  });
});

describe("shipping addresses", () => {
  const address = {
    name: "Asha Rao",
    phone: "9845012345",
    line1: "12 Church Street",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001"
  };

  it("accepts a complete Indian address and compares supply state", () => {
    expect(addressError(address)).toBeNull();
    expect(addressError({ ...address, pincode: "5600" })).toMatch(/Pincode/);
    expect(sameSupplyState("Karnataka", "karnataka")).toBe(true);
    expect(sameSupplyState("Karnataka", "Maharashtra")).toBe(false);
    expect(sameSupplyState("", "Karnataka")).toBe(true);
  });
});

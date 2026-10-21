import { describe, expect, it } from "vitest";
import { couponDiscount, normalizeCouponCode } from "../../lib/store/coupons";
import { DEFAULT_STORE_RULES, quoteOrder } from "../../lib/store/pricing";
import { STORE_COUPON_LIMIT, storeCouponRateKeys } from "../../lib/store/limits";
import { buildOrderText } from "../../lib/tap/order-message";

const live = {
  kind: "PERCENT" as const,
  amount: 10,
  minSubtotalPaise: 10000,
  expiresAt: null,
  usageLimit: 2,
  usedCount: 0,
  active: true
};

describe("coupons", () => {
  it("rejects an inactive, expired, under-minimum, or used-up code", () => {
    expect(normalizeCouponCode(" save-10 ")).toBe("SAVE10");
    expect(couponDiscount({ ...live, active: false }, 20000)).toEqual({ ok: false, code: "invalid" });
    expect(couponDiscount({ ...live, expiresAt: "2020-01-01T00:00:00.000Z" }, 20000, new Date("2026-01-01T00:00:00.000Z"))).toEqual({
      ok: false,
      code: "expired"
    });
    expect(couponDiscount(live, 5000)).toEqual({ ok: false, code: "minimum" });
    expect(couponDiscount({ ...live, usedCount: 2 }, 20000)).toEqual({ ok: false, code: "used" });
    expect(couponDiscount(live, 20000)).toEqual({ ok: true, discountPaise: 2000 });
    expect(couponDiscount({ ...live, kind: "FLAT", amount: 50000 }, 20000)).toEqual({ ok: true, discountPaise: 20000 });
  });

  it("limits coupon checks and keeps a rejected code off the total", () => {
    expect(STORE_COUPON_LIMIT).toEqual({ limit: 20, windowSeconds: 600 });
    expect(storeCouponRateKeys("1.2.3.4", "biz_1")).toEqual([
      "store-coupon:ip:1.2.3.4",
      "store-coupon:store:biz_1"
    ]);
    const rejected = couponDiscount(live, 5000);
    const quote = quoteOrder({
      rules: { ...DEFAULT_STORE_RULES, gstEnabled: true, packingChargePaise: 0 },
      orderType: "DINE_IN",
      subtotalPaise: 5000,
      discountPaise: rejected.ok ? rejected.discountPaise : 0
    });
    expect(quote.ok && quote.discountPaise).toBe(0);
    expect(quote.ok && quote.totalPaise).toBe(5000);
  });

  it("takes the coupon off the GST base and the WhatsApp total", () => {
    const quote = quoteOrder({
      rules: { ...DEFAULT_STORE_RULES, gstEnabled: true, packingChargePaise: 0 },
      orderType: "DINE_IN",
      subtotalPaise: 20000,
      discountPaise: 2000
    });
    expect(quote.ok && quote.gstPaise).toBe(Math.round((18000 * 5) / 105));
    expect(quote.ok && quote.totalPaise).toBe(18000);
    if (!quote.ok) return;
    const text = buildOrderText({
      businessName: "Demo Cafe",
      lines: [{ name: "Pizza", qty: 1, unitPaise: 20000 }],
      charges: {
        subtotalPaise: quote.subtotalPaise,
        discountPaise: quote.discountPaise,
        gstPaise: quote.gstPaise,
        pricesIncludeGst: true,
        totalPaise: quote.totalPaise
      }
    });
    expect(text).toContain("Discount: ₹20");
    expect(text).toContain("Total: ₹180");
  });
});

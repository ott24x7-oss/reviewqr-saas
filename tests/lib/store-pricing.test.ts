import { describe, expect, it } from "vitest";
import { STORE_COUPON_LIMIT, STORE_ORDER_LIMIT, storeCouponRateKeys, storeOrderRateKeys } from "../../lib/store/limits";
import {
  DEFAULT_STORE_RULES,
  isOrderForLater,
  parsePincodeList,
  quoteOrder,
  type StoreRules
} from "../../lib/store/pricing";

const openTuesday: StoreRules = {
  ...DEFAULT_STORE_RULES,
  hours: { tue: { open: "10:00", close: "18:00" } },
  delivery: true,
  pincodes: ["560001"],
  deliveryChargePaise: 4000,
  freeDeliveryAbovePaise: 50000,
  minOrderPaise: 10000,
  packingChargePaise: 1000,
  gstEnabled: true,
  gstPercent: 5,
  pricesIncludeGst: true,
  prepMinutes: 25
};

describe("store pricing", () => {
  it("treats holiday and closed hours as order for later, and missing hours as open", () => {
    expect(isOrderForLater({ holiday: true, hours: null })).toBe(true);
    expect(isOrderForLater({ holiday: false, hours: null })).toBe(false);
    expect(isOrderForLater(openTuesday, new Date("2026-10-20T04:30:00Z"))).toBe(false);
    expect(isOrderForLater(openTuesday, new Date("2026-10-20T14:00:00Z"))).toBe(true);
  });

  it("parses a pincode list and rejects delivery outside it", () => {
    expect(parsePincodeList("560001, 560038\n110001")).toEqual(["560001", "560038", "110001"]);
    const blocked = quoteOrder({
      rules: openTuesday,
      orderType: "DELIVERY",
      subtotalPaise: 20000,
      pincode: "560002"
    });
    expect(blocked).toEqual({ ok: false, code: "pincode" });
    const any = quoteOrder({
      rules: { ...openTuesday, pincodes: [] },
      orderType: "DELIVERY",
      subtotalPaise: 20000,
      pincode: "110001"
    });
    expect(any.ok).toBe(true);
  });

  it("enforces the minimum and skips packing on dine-in", () => {
    const low = quoteOrder({ rules: openTuesday, orderType: "DINE_IN", subtotalPaise: 8000 });
    expect(low).toEqual({ ok: false, code: "min_order", shortfallPaise: 2000 });
    const dine = quoteOrder({ rules: openTuesday, orderType: "DINE_IN", subtotalPaise: 20000 });
    expect(dine.ok && dine.packingPaise).toBe(0);
    expect(dine.ok && dine.deliveryPaise).toBe(0);
  });

  it("adds packing and waives delivery at the free threshold", () => {
    const charged = quoteOrder({
      rules: openTuesday,
      orderType: "DELIVERY",
      subtotalPaise: 20000,
      pincode: "560001"
    });
    expect(charged.ok && charged.packingPaise).toBe(1000);
    expect(charged.ok && charged.deliveryPaise).toBe(4000);
    const free = quoteOrder({
      rules: openTuesday,
      orderType: "DELIVERY",
      subtotalPaise: 50000,
      pincode: "560001"
    });
    expect(free.ok && free.deliveryPaise).toBe(0);
  });

  it("shows GST inside the total when prices include it", () => {
    const quote = quoteOrder({ rules: openTuesday, orderType: "TAKEAWAY", subtotalPaise: 20000 });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    const base = 20000 + 1000;
    expect(quote.gstPaise).toBe(Math.round((base * 5) / 105));
    expect(quote.totalPaise).toBe(base);
    expect(quote.pricesIncludeGst).toBe(true);
    expect(quote.prepMinutes).toBe(25);
  });

  it("adds GST on top when prices do not include it", () => {
    const quote = quoteOrder({
      rules: { ...openTuesday, pricesIncludeGst: false },
      orderType: "TAKEAWAY",
      subtotalPaise: 20000
    });
    expect(quote.ok).toBe(true);
    if (!quote.ok) return;
    const base = 21000;
    expect(quote.gstPaise).toBe(Math.round((base * 5) / 100));
    expect(quote.totalPaise).toBe(base + quote.gstPaise);
  });

  it("adds no tax line when GST is off", () => {
    const quote = quoteOrder({
      rules: { ...openTuesday, gstEnabled: false, pricesIncludeGst: false },
      orderType: "TAKEAWAY",
      subtotalPaise: 20000
    });
    expect(quote.ok && quote.gstPaise).toBe(0);
    expect(quote.ok && quote.totalPaise).toBe(21000);
  });
});

describe("store rate limits", () => {
  it("limits orders and coupon checks per IP and per store", () => {
    expect(STORE_ORDER_LIMIT).toEqual({ limit: 10, windowSeconds: 600 });
    expect(STORE_COUPON_LIMIT).toEqual({ limit: 20, windowSeconds: 600 });
    expect(storeOrderRateKeys("1.2.3.4", "biz_1")).toEqual([
      "store-order:ip:1.2.3.4",
      "store-order:store:biz_1"
    ]);
    expect(storeCouponRateKeys("1.2.3.4", "biz_1")[1]).toBe("store-coupon:store:biz_1");
  });
});

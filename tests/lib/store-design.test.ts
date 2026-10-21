import { describe, expect, it } from "vitest";
import {
  DESIGN_PICKER,
  bannerIsVisible,
  categoryInitials,
  dealClock,
  percentOff,
  resolveDesign,
  showFlash,
  soonestExpiry
} from "../../lib/store/design";

const now = new Date("2026-10-21T12:00:00Z");

describe("store design", () => {
  it("lists Classic first in the owner picker", () => {
    expect(DESIGN_PICKER.map((choice) => choice.id)).toEqual(["CLASSIC", "PREMIUM", "MINIMAL", "BOLD"]);
    expect(DESIGN_PICKER.map((choice) => choice.label)).toEqual(["Classic", "Premium Store", "Minimal", "Bold Dark"]);
    expect(resolveDesign(undefined)).toBe(DESIGN_PICKER[0].id);
  });

  it("defaults a missing or unknown design to Classic", () => {
    expect(resolveDesign(undefined)).toBe("CLASSIC");
    expect(resolveDesign(null)).toBe("CLASSIC");
    expect(resolveDesign("")).toBe("CLASSIC");
    expect(resolveDesign("nope")).toBe("CLASSIC");
    expect(resolveDesign("PREMIUM")).toBe("PREMIUM");
    expect(resolveDesign("MINIMAL")).toBe("MINIMAL");
    expect(resolveDesign("BOLD")).toBe("BOLD");
  });

  it("uses one character when a category has no photo", () => {
    expect(categoryInitials("Coffee")).toBe("C");
    expect(categoryInitials("  tea")).toBe("T");
    expect(categoryInitials("कॉफी")).toBe("क");
    expect(categoryInitials("")).toBe("?");
  });

  it("shows a percent only when the MRP is higher", () => {
    expect(percentOff(8000, 10000)).toBe(20);
    expect(percentOff(10000, 10000)).toBe(0);
    expect(percentOff(12000, 10000)).toBe(0);
    expect(percentOff(8000, null)).toBe(0);
  });

  it("ignores past expiries and picks the soonest future one", () => {
    expect(soonestExpiry([], now)).toBeNull();
    expect(soonestExpiry([{ id: "past", expiresAt: "2026-10-20T00:00:00Z" }], now)).toBeNull();
    const picked = soonestExpiry(
      [
        { id: "later", expiresAt: "2026-10-25T00:00:00Z" },
        { id: "soon", expiresAt: "2026-10-22T00:00:00Z" },
        { id: "past", expiresAt: "2026-10-01T00:00:00Z" },
        { id: "open", expiresAt: null }
      ],
      now
    );
    expect(picked?.id).toBe("soon");
  });

  it("hides the deal and flash row when nothing expires", () => {
    expect(dealClock([], [], now)).toBeNull();
    expect(dealClock([{ id: "b", title: "Lunch", body: "", expiresAt: null }], [], now)).toBeNull();
    const items = [{ pricePaise: 8000, mrpPaise: 10000 }];
    expect(showFlash(items, null)).toEqual([]);
    expect(bannerIsVisible(null, now)).toBe(true);
    expect(bannerIsVisible("2026-10-20T00:00:00Z", now)).toBe(false);
    expect(bannerIsVisible("2026-10-22T00:00:00Z", now)).toBe(true);
  });

  it("uses a coupon clock when no banner expires, and prefers an earlier banner", () => {
    const couponOnly = dealClock(
      [],
      [{ id: "c", code: "SAVE10", kind: "PERCENT", amount: 10, expiresAt: "2026-10-22T18:29:59.999Z", active: true }],
      now
    );
    expect(couponOnly?.kind).toBe("coupon");
    expect(couponOnly?.title).toBe("SAVE10");
    expect(couponOnly?.detail).toBe("10% off");
    expect(showFlash([{ pricePaise: 8000, mrpPaise: 10000 }, { pricePaise: 5000, mrpPaise: 4000 }], couponOnly)).toEqual([
      { pricePaise: 8000, mrpPaise: 10000 }
    ]);

    const bannerFirst = dealClock(
      [{ id: "b", title: "Today", body: "Soup", expiresAt: "2026-10-22T00:00:00Z" }],
      [{ id: "c", code: "SAVE10", kind: "FLAT", amount: 5000, expiresAt: "2026-10-23T00:00:00Z", active: true }],
      now
    );
    expect(bannerFirst?.kind).toBe("banner");
    expect(bannerFirst?.title).toBe("Today");
    expect(bannerFirst?.detail).toBe("Soup");
  });
});

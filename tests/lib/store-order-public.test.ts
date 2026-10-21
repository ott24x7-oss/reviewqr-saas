import { describe, expect, it } from "vitest";
import { buildOrderText } from "../../lib/tap/order-message";
import { kolkataDayWindow } from "../../lib/store/day";
import { keepReorderLines, toPublicStatus } from "../../lib/store/order-public";

describe("public order status", () => {
  it("uses the Asia/Kolkata calendar day", () => {
    const nextMorning = kolkataDayWindow(new Date("2026-10-21T20:00:00.000Z"));
    expect(nextMorning.day).toBe("2026-10-22");
    expect(nextMorning.start.toISOString()).toBe("2026-10-21T18:30:00.000Z");
    const sameEvening = kolkataDayWindow(new Date("2026-10-21T18:00:00.000Z"));
    expect(sameEvening.day).toBe("2026-10-21");
    expect(sameEvening.end.getTime() - sameEvening.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("leaves phone, address, and notes off the customer page", () => {
    const view = toPublicStatus({
      number: "M1",
      businessName: "Demo Cafe",
      status: "ACCEPTED",
      lang: "hi",
      createdAt: new Date("2026-10-21T10:00:00.000Z"),
      orderType: "DELIVERY",
      items: [{ id: "tea", name: "Tea", qty: 2, note: "call 9876543210", variantId: "", addonIds: [] }],
      totalPaise: 16000,
      events: [
        { status: "NEW", at: "2026-10-21T10:00:00.000Z" },
        { status: "ACCEPTED", at: "2026-10-21T10:05:00.000Z" }
      ],
      reorderCode: "DEMO-CNTR",
      customerPhone: "919876543210",
      customerName: "Asha",
      tableOrAddress: "12 Secret Road",
      pincode: "560001",
      note: "gate code 1234"
    });
    const json = JSON.stringify(view);
    expect(json).not.toContain("919876543210");
    expect(json).not.toContain("9876543210");
    expect(json).not.toContain("Secret");
    expect(json).not.toContain("560001");
    expect(json).not.toContain("gate code");
    expect(json).not.toContain("Asha");
    expect(view.items).toEqual([{ name: "Tea", qty: 2 }]);
    const namedOnly = toPublicStatus({
      number: "M9",
      businessName: "Demo Cafe",
      status: "NEW",
      createdAt: "2026-10-21T10:00:00.000Z",
      items: [{ name: "Filter coffee", qty: 1 }],
      totalPaise: 8000,
      events: null
    });
    expect(namedOnly.items).toEqual([{ name: "Filter coffee", qty: 1 }]);
    expect(view.events.map((event) => event.status)).toEqual(["NEW", "ACCEPTED"]);
    expect(view.reorderCode).toBe("DEMO-CNTR");
    expect(view.lang).toBe("hi");
  });

  it("starts a timeline when an older order has none", () => {
    const view = toPublicStatus({
      number: "M2",
      businessName: "Demo Cafe",
      status: "NEW",
      createdAt: "2026-10-21T10:00:00.000Z",
      items: [],
      totalPaise: 0,
      events: null
    });
    expect(view.events).toEqual([{ status: "NEW", at: "2026-10-21T10:00:00.000Z" }]);
  });

  it("keeps only items that can still be ordered", () => {
    const lines = keepReorderLines(
      [
        { id: "tea", name: "Tea", qty: 1, variantId: "", addonIds: [] },
        { id: "cake", name: "Cake", qty: 1, variantId: "half", addonIds: [] },
        { id: "gone", name: "Gone", qty: 1, variantId: "", addonIds: [] }
      ],
      [
        { id: "tea", available: true, pricePaise: 8000, variants: [], addOns: [] },
        {
          id: "cake",
          available: true,
          pricePaise: 10000,
          variants: [{ id: "half", label: "Half", size: "", colour: "", pricePaise: 6000, inStock: false }],
          addOns: []
        },
        { id: "gone", available: false, pricePaise: 100, variants: [], addOns: [] }
      ]
    );
    expect(lines).toEqual([{ id: "tea", variantId: "", addonIds: [], qty: 1 }]);
  });

  it("adds a track link only when one is set", () => {
    const without = buildOrderText({
      businessName: "Demo Cafe",
      lines: [{ name: "Tea", qty: 1, unitPaise: 8000 }],
      charges: { subtotalPaise: 8000, totalPaise: 8000 }
    });
    expect(without).not.toContain("Track:");
    const withTrack = buildOrderText({
      businessName: "Demo Cafe",
      lines: [{ name: "Tea", qty: 1, unitPaise: 8000 }],
      charges: { subtotalPaise: 8000, totalPaise: 8000, trackUrl: "https://reviewqr.in/o/abc" }
    });
    expect(withTrack).toContain("Track: https://reviewqr.in/o/abc");
    const hindi = buildOrderText({
      businessName: "Demo Cafe",
      lines: [{ name: "Tea", qty: 1, unitPaise: 8000 }],
      hindi: true,
      charges: { subtotalPaise: 8000, totalPaise: 8000, trackUrl: "https://reviewqr.in/o/abc" }
    });
    expect(hindi).toContain("स्थिति: https://reviewqr.in/o/abc");
  });
});

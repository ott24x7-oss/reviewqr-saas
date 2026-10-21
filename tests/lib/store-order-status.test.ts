import { describe, expect, it } from "vitest";
import {
  appendStatusEvent,
  canSetStatus,
  consentedPhone,
  customerStatusLink,
  nextStatusEvents,
  statusMessage,
  toOrderCard
} from "../../lib/store/order-status";

describe("order status", () => {
  it("rejects only from new or accepted and allows every other move", () => {
    expect(canSetStatus("NEW", "REJECTED")).toBe(true);
    expect(canSetStatus("ACCEPTED", "REJECTED")).toBe(true);
    expect(canSetStatus("PREPARING", "REJECTED")).toBe(false);
    expect(canSetStatus("READY", "REJECTED")).toBe(false);
    expect(canSetStatus("OUT_FOR_DELIVERY", "REJECTED")).toBe(false);
    expect(canSetStatus("COMPLETED", "REJECTED")).toBe(false);
    expect(canSetStatus("NEW", "NEW")).toBe(true);
    expect(canSetStatus("REJECTED", "REJECTED")).toBe(true);
    expect(canSetStatus("REJECTED", "COMPLETED")).toBe(true);
    expect(canSetStatus("NEW", "READY")).toBe(true);
    expect(canSetStatus("COMPLETED", "NEW")).toBe(true);
    expect(canSetStatus("PREPARING", "NOPE" as "PREPARING")).toBe(false);
  });

  it("includes the order number in English and Hindi", () => {
    expect(statusMessage("ACCEPTED", "M123", "Demo Cafe", false)).toBe("Your order M123 at Demo Cafe is accepted.");
    expect(statusMessage("READY", "M123", "Demo Cafe", true)).toBe("Demo Cafe पर ऑर्डर M123 तैयार है।");
    expect(statusMessage("REJECTED", "M9", "  ", true)).toContain("M9");
    expect(statusMessage("NEW", "M9", "Demo Cafe", false)).toBe("New order M9 at Demo Cafe.");
  });

  it("builds a WhatsApp link only when the phone was saved with consent", () => {
    expect(customerStatusLink(null, new Date(), "hi")).toBeNull();
    expect(customerStatusLink("9876543210", null, "hi")).toBeNull();
    expect(customerStatusLink("", new Date(), "hi")).toBeNull();
    const link = customerStatusLink("9876543210", "2026-10-21T10:00:00.000Z", "Order M1 is ready");
    expect(link).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(decodeURIComponent(link!.split("text=")[1])).toBe("Order M1 is ready");
    expect(customerStatusLink("12", new Date(), "x")).toBeNull();
  });

  it("stores a phone only when consent and a usable number are both present", () => {
    const at = new Date("2026-10-21T10:00:00.000Z");
    expect(consentedPhone("9876543210", false, at)).toEqual({ customerPhone: null, consentAt: null });
    expect(consentedPhone("9876543210", undefined, at)).toEqual({ customerPhone: null, consentAt: null });
    expect(consentedPhone("nope", true, at)).toEqual({ customerPhone: null, consentAt: null });
    expect(consentedPhone("9876543210", true, at)).toEqual({
      customerPhone: "919876543210",
      consentAt: at
    });
  });

  it("does not repeat the latest status in the timeline", () => {
    const once = appendStatusEvent([], "NEW", new Date("2026-10-21T10:00:00.000Z"));
    expect(appendStatusEvent(once, "NEW")).toEqual(once);
    expect(appendStatusEvent(once, "ACCEPTED", new Date("2026-10-21T10:05:00.000Z"))).toEqual([
      { status: "NEW", at: "2026-10-21T10:00:00.000Z" },
      { status: "ACCEPTED", at: "2026-10-21T10:05:00.000Z" }
    ]);
    expect(appendStatusEvent([{ status: "NOPE", at: "x" }, { foo: 1 }], "READY", new Date("2026-10-21T10:06:00.000Z"))).toEqual([
      { status: "READY", at: "2026-10-21T10:06:00.000Z" }
    ]);
    expect(nextStatusEvents(null, "NEW", "ACCEPTED", new Date("2026-10-21T10:00:00.000Z"), new Date("2026-10-21T10:05:00.000Z"))).toEqual([
      { status: "NEW", at: "2026-10-21T10:00:00.000Z" },
      { status: "ACCEPTED", at: "2026-10-21T10:05:00.000Z" }
    ]);
  });

  it("hides the phone unless the customer consented", () => {
    const base = {
      id: "o1",
      number: "M1",
      businessName: "Demo Cafe",
      status: "NEW",
      createdAt: "2026-10-21T10:00:00.000Z",
      customerName: "Asha",
      place: "Table 2",
      note: "",
      orderType: "DINE_IN",
      pincode: "",
      payment: "CASH",
      totalPaise: 12000,
      items: [{ name: "Tea", qty: 2, note: "less sugar" }, { bad: true }]
    };
    const hidden = toOrderCard({ ...base, customerPhone: "919876543210", consentAt: null }, false);
    expect(hidden.phone).toBeNull();
    expect(hidden.whatsAppUrl).toBeNull();
    expect(hidden.canManage).toBe(false);
    expect(hidden.items).toEqual([{ name: "Tea", qty: 2, note: "less sugar" }]);

    const shown = toOrderCard(
      { ...base, customerPhone: "9876543210", consentAt: "2026-10-21T10:00:00.000Z", lang: "hi" },
      true
    );
    expect(shown.phone).toBe("9876543210");
    expect(shown.lang).toBe("hi");
    expect(shown.canManage).toBe(true);
    expect(shown.whatsAppUrl).toContain("https://wa.me/919876543210?text=");
    expect(decodeURIComponent(shown.whatsAppUrl!.split("text=")[1])).toContain("M1");
  });
});

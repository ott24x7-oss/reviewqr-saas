import { describe, expect, it } from "vitest";
import { carrierEventAction, carrierEventKey, carrierMove } from "../../lib/shop/carrier-event";
import { shopStatusNotice } from "../../lib/shop/status-notice";

describe("carrier events", () => {
  it("keeps a failed delivery on Shipped", () => {
    expect(carrierEventAction("NDR - customer not available")).toBe("ndr");
    expect(carrierEventAction("Undelivered")).toBe("ndr");
    expect(carrierMove("SHIPPED", "ndr")).toEqual({ ndr: true, to: null });
    expect(carrierMove("PACKED", "ndr")).toEqual({ ndr: false, to: null });
  });

  it("maps delivery, RTO, and an in-transit scan", () => {
    expect(carrierEventAction("Delivered")).toBe("delivered");
    expect(carrierEventAction("RTO initiated")).toBe("rto");
    expect(carrierEventAction("In transit")).toBe("shipped");
    expect(carrierMove("SHIPPED", "delivered").to).toBe("DELIVERED");
    expect(carrierMove("SHIPPED", "rto").to).toBe("RTO");
    expect(carrierMove("PICKUP_SCHEDULED", "shipped").to).toBe("SHIPPED");
    expect(carrierMove("DELIVERED", "delivered").to).toBeNull();
    expect(carrierMove("PAID", "shipped").to).toBeNull();
  });

  it("uses one idempotency key for the same event, AWB, and status", () => {
    const key = carrierEventKey("evt-1", "MOCK560001", "Delivered");
    expect(key).toBe(carrierEventKey("evt-1", "MOCK560001", "delivered"));
    expect(key).not.toBe(carrierEventKey("evt-2", "MOCK560001", "Delivered"));
  });

  it("puts the tracking link in the status notice", () => {
    const notice = shopStatusNotice({
      statusLabel: "Shipped",
      businessName: "Shop Cafe",
      trackingUrl: "https://example.test/dashboard/shop/orders/1",
      awb: "MOCK560001",
      ndr: "Customer not available"
    });
    expect(notice.subject).toContain("Shipped");
    expect(notice.text).toContain("https://example.test/dashboard/shop/orders/1");
    expect(notice.text).toContain("MOCK560001");
    expect(notice.text).toContain("Customer not available");
  });
});

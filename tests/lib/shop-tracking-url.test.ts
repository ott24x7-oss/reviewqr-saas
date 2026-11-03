import { describe, expect, it } from "vitest";
import { shopTrackingUrl } from "../../lib/shop/tracking-url";

describe("shop public carrier tracking URLs", () => {
  it("builds carrier pages from a provider and AWB", () => {
    expect(shopTrackingUrl("shiprocket", "SR 123")).toBeNull();
    expect(shopTrackingUrl("shiprocket", "SR-123")).toBe("https://www.shiprocket.in/shipment-tracking/?awb=SR-123");
    expect(shopTrackingUrl("delhivery", "DL_456")).toBe("https://www.delhivery.com/tracking?uniqueIdentifier=DL_456");
    expect(shopTrackingUrl("mock", "MOCK-456")).toBeNull();
    expect(shopTrackingUrl("delhivery", null)).toBeNull();
  });
});

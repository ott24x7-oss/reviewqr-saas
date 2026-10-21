import { describe, expect, it } from "vitest";
import { normalizeUpiId, upiAmount, upiPayUrl } from "../../lib/store/upi";

describe("UPI pay link", () => {
  it("puts the exact rupee and paise total in am", () => {
    expect(upiAmount(18000)).toBe("180.00");
    expect(upiAmount(18050)).toBe("180.50");
    const whole = new URL(upiPayUrl("Shop@OKAxis", "Demo Cafe", 18000));
    const paise = new URL(upiPayUrl("shop@okaxis", "Demo Cafe", 18050));
    expect(whole.protocol).toBe("upi:");
    expect(whole.searchParams.get("pa")).toBe("shop@okaxis");
    expect(whole.searchParams.get("am")).toBe("180.00");
    expect(whole.searchParams.get("cu")).toBe("INR");
    expect(paise.searchParams.get("am")).toBe("180.50");
    expect(normalizeUpiId("not an id")).toBeNull();
    expect(upiPayUrl("", "Demo", 100)).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { designError } from "../../lib/shop/design";
import { deliveryEstimate } from "../../lib/shop/estimate";
import { gstinError } from "../../lib/shop/gstin";
import { SHOP_LANGS, shopCopy } from "../../lib/shop/i18n";
import { createMockProvider } from "../../lib/shop/shipping";

describe("shop design, tax id, and copy", () => {
  it("requires a template and QR for printed hardware, and an NFC tag when the product needs one", () => {
    expect(designError({ needsDesign: true, needsNfc: true }, null)).toMatch(/business/i);
    expect(
      designError(
        { needsDesign: true, needsNfc: true },
        { templateId: "standee-4x6", businessId: "biz", qrShortCode: "DEMO-CNTR", deviceId: "dev" }
      )
    ).toBeNull();
    expect(designError({ needsDesign: true, needsNfc: false }, { templateId: "missing", businessId: "biz", qrShortCode: "QR" })).toMatch(/template/i);
    expect(designError({ needsDesign: false, needsNfc: false }, null)).toBeNull();
  });

  it("checks a GSTIN and keeps Hindi copy for the print policy", () => {
    expect(gstinError("")).toBeNull();
    expect(gstinError("29AABCU9603R1ZM")).toBeNull();
    expect(gstinError("not-a-gstin")).toMatch(/GSTIN/);
    const english = shopCopy("en");
    const hindi = shopCopy("hi");
    expect(Object.keys(english)).toEqual(Object.keys(hindi));
    expect(hindi.policy).not.toBe(english.policy);
    expect(SHOP_LANGS).toEqual(["en", "hi"]);
  });

  it("estimates delivery from the mock carrier without a network call", async () => {
    const estimate = await deliveryEstimate(createMockProvider(), "560001", 350);
    expect(estimate.ok && estimate.serviceable).toBe(true);
    if (!estimate.ok || !estimate.serviceable) return;
    expect(estimate.courierName).toBe("Mock Surface");
    expect(estimate.ratePaise).toBe(4000 + 350 * 2);
    const blocked = await deliveryEstimate(createMockProvider(), "999999", 350);
    expect(blocked.ok && blocked.serviceable).toBe(false);
    const digital = await deliveryEstimate(createMockProvider(), "560001", 0);
    expect(digital.ok && digital.message).toBe("No shipping");
  });
});
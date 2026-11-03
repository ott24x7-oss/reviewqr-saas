import { describe, expect, it } from "vitest";
import { hideBusinessBranding, showPlatformBranding } from "../../lib/branding/hide-business-branding";

describe("customer-facing platform branding", () => {
  it("shows the footer for shown businesses and hides it for unbranded businesses", () => {
    expect(showPlatformBranding(false)).toBe(true);
    expect(showPlatformBranding(true)).toBe(false);
  });

  it("keeps admin and purchase choices while applying the agency plan default", () => {
    expect(hideBusinessBranding({ enabled: false, source: "ADMIN", agencyPlan: true })).toBe(false);
    expect(hideBusinessBranding({ enabled: false, source: "PURCHASE", agencyPlan: false })).toBe(true);
    expect(hideBusinessBranding({ enabled: false, source: null, agencyPlan: true })).toBe(true);
    expect(hideBusinessBranding({ enabled: false, source: null, agencyPlan: false })).toBe(false);
  });
});

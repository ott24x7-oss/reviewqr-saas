import { describe, expect, it } from "vitest";
import {
  comparisonFeatureOrder,
  comparisonGroupForFeature,
  isMarketingFeature,
  isPlanFeatureAvailable,
  isPlanModuleUsable
} from "../../lib/plans/comparison";

const plan = {
  modules: ["REVIEWS", "MENU", "STORE"],
  limits: { businesses: 1, qrCodes: 1, locations: 1, staff: 0, products: 10, aiCalls: 0 }
};

describe("plan comparison feature gates", () => {
  it("hides features when their plan capacity cannot be used", () => {
    expect(isPlanFeatureAvailable("Staff", plan)).toBe(false);
    expect(isPlanFeatureAvailable("Multiple QRs", plan)).toBe(false);
    expect(isPlanFeatureAvailable("Locations", plan)).toBe(false);
    expect(isPlanFeatureAvailable("AI replies", plan)).toBe(false);
  });

  it("requires the Menu module and at least one catalogue item for menu features", () => {
    expect(isPlanFeatureAvailable("Menu", plan)).toBe(true);
    expect(isPlanFeatureAvailable("Service booking", plan)).toBe(true);
    expect(isPlanFeatureAvailable("Menu", { ...plan, limits: { ...plan.limits, products: 0 } })).toBe(false);
    expect(isPlanFeatureAvailable("Service booking", { ...plan, modules: ["REVIEWS" ] })).toBe(false);
  });

  it("hides unbuilt custom domains and keeps feature groups tied to modules", () => {
    expect(isMarketingFeature("Custom domain")).toBe(false);
    expect(isPlanFeatureAvailable("Custom domain", plan)).toBe(false);
    expect(comparisonGroupForFeature("AI replies")).toBe("REVIEWS");
    expect(comparisonGroupForFeature("Menu")).toBe("MENU");
    expect(comparisonGroupForFeature("Unknown feature")).toBeNull();
  });

  it("orders review comparison rows in the requested sequence", () => {
    const labels = [
      "Page themes",
      "Direct link",
      "NFC",
      "Multiple QRs",
      "Locations",
      "Staff",
      "Campaigns",
      "PDF report",
      "Analytics",
      "Customers",
      "Testimonials",
      "AI replies",
      "Reviews log"
    ];
    expect(labels.sort((a, b) => comparisonFeatureOrder(a) - comparisonFeatureOrder(b))).toEqual([
      "Reviews log",
      "AI replies",
      "Testimonials",
      "Customers",
      "Analytics",
      "PDF report",
      "Campaigns",
      "Staff",
      "Locations",
      "Multiple QRs",
      "NFC",
      "Direct link",
      "Page themes"
    ]);
  });

  it("hides the module summary when its item cap is zero", () => {
    expect(isPlanModuleUsable("MENU", plan)).toBe(true);
    expect(isPlanModuleUsable("MENU", { ...plan, limits: { ...plan.limits, products: 0 } })).toBe(false);
    expect(isPlanModuleUsable("MENU", { ...plan, modules: ["REVIEWS"] })).toBe(false);
  });
});

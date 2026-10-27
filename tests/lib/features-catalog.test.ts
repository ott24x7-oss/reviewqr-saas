import { FEATURE_MODULE_IDS, FEATURES, featureById } from "@reviewqr/shared";
import { describe, expect, it } from "vitest";
import { MODULES } from "../../lib/plans/catalog";

const OWNER_FEATURES = [
  "menu",
  "services-booking",
  "orders",
  "whatsapp-orders",
  "store",
  "offers",
  "campaigns",
  "customers",
  "reviews-log",
  "testimonials",
  "ai-replies",
  "analytics",
  "pdf-report",
  "staff",
  "locations",
  "nfc",
  "multiple-qrs",
  "direct-link",
  "page-themes",
  "custom-domain"
] as const;

describe("owner feature catalogue", () => {
  it("uses the same module ids as the plan catalogue", () => {
    expect(MODULES.map((item) => item.id)).toEqual([...FEATURE_MODULE_IDS]);
  });

  it("maps every owner feature onto one catalogue module", () => {
    const ids = FEATURES.map((feature) => feature.id);
    expect(ids).toEqual([...OWNER_FEATURES]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const feature of FEATURES) {
      expect(FEATURE_MODULE_IDS).toContain(feature.module);
      expect(feature.labelEn.length).toBeGreaterThan(0);
      expect(feature.labelHi.length).toBeGreaterThan(0);
      expect(feature.doesEn.length).toBeGreaterThan(0);
      expect(feature.doesHi.length).toBe(feature.doesEn.length);
      expect(featureById(feature.id)?.module).toBe(feature.module);
    }
  });
});

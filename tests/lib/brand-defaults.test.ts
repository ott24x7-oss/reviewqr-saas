import { describe, expect, it } from "vitest";
import {
  brandFromOrDefault,
  brandNameOrDefault,
  brandTaglineOrDefault,
  planDescriptionOrDefault,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  PREVIOUS_BRAND_NAME
} from "../../lib/brand-defaults";

describe("brand defaults", () => {
  it("uses QR24x7 and the tagline when nothing is stored", () => {
    expect(brandNameOrDefault("")).toBe(DEFAULT_BRAND_NAME);
    expect(brandNameOrDefault("  ")).toBe("QR24x7");
    expect(brandTaglineOrDefault(null)).toBe("Scan. Tap. Grow.");
    expect(brandTaglineOrDefault("Every customer can leave a public review.")).toBe(DEFAULT_BRAND_TAGLINE);
  });

  it("maps a saved previous default and keeps a custom name", () => {
    expect(brandNameOrDefault(PREVIOUS_BRAND_NAME)).toBe("QR24x7");
    expect(brandNameOrDefault("Spice Junction")).toBe("Spice Junction");
    expect(brandTaglineOrDefault("Counters, covered.")).toBe("Counters, covered.");
    expect(brandFromOrDefault(`${PREVIOUS_BRAND_NAME} <noreply@reviewqr.in>`, "fallback")).toBe(
      "QR24x7 <noreply@reviewqr.in>"
    );
    expect(brandFromOrDefault("Desk <hi@example.com>", "fallback")).toBe("Desk <hi@example.com>");
  });

  it("maps the seeded free-plan line in English and Hindi", () => {
    expect(planDescriptionOrDefault(`Try ${PREVIOUS_BRAND_NAME} risk-free`)).toBe("Try QR24x7 risk-free");
    expect(planDescriptionOrDefault(`${PREVIOUS_BRAND_NAME} बिना जोखिम आज़माएँ`)).toBe(
      "QR24x7 बिना जोखिम आज़माएँ"
    );
    expect(planDescriptionOrDefault("For a single counter")).toBe("For a single counter");
  });
});

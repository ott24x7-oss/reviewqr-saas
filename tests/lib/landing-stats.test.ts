import { describe, expect, it } from "vitest";
import { LANDING_STAT_MINIMUMS, landingStats } from "@/lib/landing/stats";

describe("landingStats", () => {
  it("uses product facts when customer counts are below the display minimums", () => {
    expect(landingStats({ businesses: 1, reviewCount: 1, rating: null, orderCount: 1 })).toEqual([
      { value: "10 min", label: "page setup" },
      { value: "0%", label: "commission on WhatsApp orders" },
      { value: "20", label: "page themes" },
      { value: "Hindi + English", label: "customer page languages" }
    ]);
  });

  it("shows established counts and fills unused slots with product facts", () => {
    expect(landingStats({
      businesses: LANDING_STAT_MINIMUMS.businesses,
      reviewCount: LANDING_STAT_MINIMUMS.reviews,
      rating: 4.8,
      orderCount: LANDING_STAT_MINIMUMS.orders
    })).toEqual([
      { value: "50", label: "businesses using QR24x7" },
      { value: "500", label: "reviews recorded" },
      { value: "4.8", label: "average customer rating" },
      { value: "100", label: "WhatsApp orders" }
    ]);
  });

  it("requires at least 20 reviews before showing an average rating", () => {
    expect(landingStats({ businesses: null, reviewCount: 19, rating: 5, orderCount: null })[0]).toEqual({
      value: "10 min",
      label: "page setup"
    });
  });
});

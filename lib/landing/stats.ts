import type { LandingTrust } from "./proof";

export const LANDING_STAT_MINIMUMS = {
  businesses: 50,
  reviews: 500,
  orders: 100,
  ratings: 20
} as const;

export type LandingStat = { value: string; label: string };

const PRODUCT_FACTS: LandingStat[] = [
  { value: "10 min", label: "page setup" },
  { value: "0%", label: "commission on WhatsApp orders" },
  { value: "20", label: "page themes" },
  { value: "Hindi + English", label: "customer page languages" }
];

/** Shows only established usage counts, then fills every remaining slot with a product fact. */
export function landingStats(trust: LandingTrust): LandingStat[] {
  const stats: LandingStat[] = [];

  if (trust.businesses != null && trust.businesses >= LANDING_STAT_MINIMUMS.businesses) {
    stats.push({
      value: trust.businesses.toLocaleString("en-IN"),
      label: "businesses using QR24x7"
    });
  }
  if (trust.reviewCount != null && trust.reviewCount >= LANDING_STAT_MINIMUMS.reviews) {
    stats.push({
      value: trust.reviewCount.toLocaleString("en-IN"),
      label: "reviews recorded"
    });
  }
  if (trust.rating != null && (trust.reviewCount ?? 0) >= LANDING_STAT_MINIMUMS.ratings) {
    stats.push({ value: trust.rating.toFixed(1), label: "average customer rating" });
  }
  if (trust.orderCount != null && trust.orderCount >= LANDING_STAT_MINIMUMS.orders) {
    stats.push({
      value: trust.orderCount.toLocaleString("en-IN"),
      label: "WhatsApp orders"
    });
  }

  return [...stats, ...PRODUCT_FACTS].slice(0, 4);
}

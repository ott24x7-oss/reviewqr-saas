import type { PlanDuration } from "@prisma/client";

export type AnchorPrice = {
  duration: PlanDuration;
  pricePaise: number;
};

export type PriceAnchor = {
  paise: number;
  duration: PlanDuration;
  /** True when paise is a monthly equivalent of a paid price. */
  perMonth: boolean;
};

const MONTHS: Partial<Record<PlanDuration, number>> = {
  MONTH_1: 1,
  MONTH_6: 6,
  YEAR_1: 12
};

/** Paid monthly equivalent in paise. Lifetime and zero prices are not a month. */
export function monthlyEquivalentPaise(duration: PlanDuration, pricePaise: number): number | null {
  const months = MONTHS[duration];
  if (!months || pricePaise <= 0) return null;
  // Whole rupees, rounded up, so "From ₹417/month" never understates the price.
  return Math.ceil(pricePaise / months / 100) * 100;
}

/**
 * Cheapest paid monthly equivalent across active prices.
 * A free plan (0) never wins. Lifetime is skipped because it is not a month.
 */
export function priceAnchor(plans: Array<{ prices: AnchorPrice[] }>): PriceAnchor | null {
  let best: { paise: number; duration: PlanDuration } | null = null;
  for (const plan of plans) {
    for (const price of plan.prices) {
      const equivalent = monthlyEquivalentPaise(price.duration, price.pricePaise);
      if (equivalent == null) continue;
      const shorter =
        best != null &&
        equivalent === best.paise &&
        (MONTHS[price.duration] ?? 99) < (MONTHS[best.duration] ?? 99);
      if (!best || equivalent < best.paise || shorter) {
        best = { paise: equivalent, duration: price.duration };
      }
    }
  }
  if (!best) return null;
  return { paise: best.paise, duration: best.duration, perMonth: true };
}

/** A plan whose every active price is 0. Shown as Start free, never as the price anchor. */
export function freePlanOffer(
  plans: Array<{ slug: string; prices: AnchorPrice[] }>
): { slug: string; duration: PlanDuration } | null {
  const free = plans.find((plan) => plan.prices.length > 0 && plan.prices.every((price) => price.pricePaise <= 0));
  if (!free) return null;
  const month = free.prices.find((price) => price.duration === "MONTH_1");
  return { slug: free.slug, duration: month?.duration || free.prices[0].duration };
}

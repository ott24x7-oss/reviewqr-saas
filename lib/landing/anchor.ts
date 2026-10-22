import type { PlanDuration } from "@prisma/client";

export type AnchorPrice = {
  duration: PlanDuration;
  pricePaise: number;
};

export type PriceAnchor = {
  paise: number;
  duration: PlanDuration;
  /** True only when the figure is a real 1-month price. */
  perMonth: boolean;
};

/** Cheapest active monthly price. If no plan has a month, the cheapest real duration. */
export function priceAnchor(plans: Array<{ prices: AnchorPrice[] }>): PriceAnchor | null {
  const monthly = plans
    .flatMap((plan) => plan.prices.filter((price) => price.duration === "MONTH_1"))
    .sort((a, b) => a.pricePaise - b.pricePaise)[0];
  if (monthly) return { paise: monthly.pricePaise, duration: "MONTH_1", perMonth: true };

  let best: AnchorPrice | null = null;
  for (const plan of plans) {
    for (const price of plan.prices) {
      if (!best || price.pricePaise < best.pricePaise) best = price;
    }
  }
  if (!best) return null;
  return { paise: best.pricePaise, duration: best.duration, perMonth: false };
}

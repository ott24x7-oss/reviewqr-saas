/** The rupee amount a tier button will charge: the catalogue PlanPrice, or null. */
export function catalogueChargePaise(
  plans: Array<{ legacyTier: string | null; prices: Array<{ duration: string; pricePaise: number }> }>,
  tier: string,
  annual: boolean
) {
  const plan = plans.find((row) => row.legacyTier === tier);
  if (!plan) return null;
  const duration = annual ? "YEAR_1" : "MONTH_1";
  const price = plan.prices.find((row) => row.duration === duration);
  if (!price || price.pricePaise <= 0) return null;
  return price.pricePaise;
}

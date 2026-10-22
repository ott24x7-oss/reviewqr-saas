import { planDescriptionOrDefault } from "../brand-defaults";
import { prisma } from "../db";
import { DURATIONS, pricingTab, savingsPercent, type PricingTab } from "./catalog";

export type PublicPlan = {
  slug: string;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  badge: string | null;
  category: string;
  imageUrl: string;
  modules: string[];
  tab: PricingTab;
  prices: Array<{
    duration: (typeof DURATIONS)[number];
    pricePaise: number;
    mrpPaise: number | null;
    savings: number;
  }>;
};

/** Active plans, including ones hidden from the pricing grid, so a free plan can still be offered. */
export async function listActivePlanPrices() {
  return prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      prices: { where: { active: true }, select: { duration: true, pricePaise: true } }
    }
  });
}

export async function listPublicPlans(): Promise<PublicPlan[]> {
  const plans = await prisma.plan.findMany({
    where: { active: true, visibleOnPricingPage: true },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { active: true } } }
  });
  return plans.map((plan) => ({
    slug: plan.slug,
    nameEn: plan.nameEn,
    nameHi: plan.nameHi,
    descriptionEn: planDescriptionOrDefault(plan.descriptionEn),
    descriptionHi: planDescriptionOrDefault(plan.descriptionHi),
    badge: plan.badge,
    category: plan.category,
    imageUrl: plan.imageUrl,
    modules: plan.modules,
    tab: pricingTab(plan.modules),
    prices: DURATIONS.flatMap((duration) => {
      const price = plan.prices.find((row) => row.duration === duration);
      if (!price) return [];
      return [
        {
          duration,
          pricePaise: price.pricePaise,
          mrpPaise: price.mrpPaise,
          savings: savingsPercent({
            pricePaise: price.pricePaise,
            mrpPaise: price.mrpPaise,
            months: duration === "MONTH_6" ? 6 : duration === "YEAR_1" ? 12 : null
          })
        }
      ];
    })
  }));
}

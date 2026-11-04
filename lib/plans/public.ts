import { planDescriptionOrDefault } from "../brand-defaults";
import { prisma } from "../db";
import { resolveBullets, type PlanBullet } from "./bullets";
import { DURATIONS, parseLimits, pricingTab, savingsPercent, type PlanLimits, type PricingTab } from "./catalog";

export type PublicPlanLimits = Pick<PlanLimits, "businesses" | "qrCodes" | "locations" | "staff" | "products" | "aiCalls">;

const ZERO_LIMITS: PlanLimits = {
  businesses: 0,
  qrCodes: 0,
  products: 0,
  staff: 0,
  aiCalls: 0,
  locations: 0,
  reviews: 0,
  campaigns: 0,
  reviewTemplates: 0,
  storeProducts: 0,
  storeOrders: 0,
  aiCallsPerMonth: 0
};

export type PublicPlan = {
  slug: string;
  updatedAt: Date;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  badge: string | null;
  category: string;
  imageUrl: string;
  modules: string[];
  limits: PublicPlanLimits;
  bullets: PlanBullet[];
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
  return plans.map((plan) => {
    // The plan row already carries its limits, so publishing them needs no extra query.
    const limits = parseLimits(plan.limits, ZERO_LIMITS);
    return {
      slug: plan.slug,
      updatedAt: plan.updatedAt,
      nameEn: plan.nameEn,
      nameHi: plan.nameHi,
      descriptionEn: planDescriptionOrDefault(plan.descriptionEn),
      descriptionHi: planDescriptionOrDefault(plan.descriptionHi),
      badge: plan.badge,
      category: plan.category,
      imageUrl: plan.imageUrl,
      modules: plan.modules,
      limits: {
        businesses: limits.businesses,
        qrCodes: limits.qrCodes,
        locations: limits.locations,
        staff: limits.staff,
        products: limits.products,
        aiCalls: limits.aiCalls
      },
      bullets: resolveBullets(plan.bullets, plan.modules),
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
    };
  });
}

import { planDescriptionOrDefault } from "@/lib/brand-defaults";
import { prisma } from "@/lib/db";
import { parseBullets } from "@/lib/plans/bullets";
import { DURATIONS, parseLimits } from "@/lib/plans/catalog";
import { limitsForTier } from "@/lib/plans/legacy";
import type { AdminPlan } from "@/app/admin/plans/plans-board";

export async function loadPlanBoardRows(planId?: string): Promise<AdminPlan[]> {
  const plans = await prisma.plan.findMany({
    where: planId ? { id: planId } : {},
    orderBy: { sortOrder: "asc" },
    include: { prices: true }
  });
  return Promise.all(
    plans.map(async (plan) => {
      const limits = parseLimits(plan.limits, await limitsForTier(plan.legacyTier));
      return {
        id: plan.id,
        nameEn: plan.nameEn,
        nameHi: plan.nameHi,
        slug: plan.slug,
        descriptionEn: planDescriptionOrDefault(plan.descriptionEn),
        descriptionHi: planDescriptionOrDefault(plan.descriptionHi),
        modules: plan.modules,
        limits: {
          businesses: limits.businesses,
          qrCodes: limits.qrCodes,
          products: limits.products,
          staff: limits.staff,
          locations: limits.locations,
          aiCalls: limits.aiCalls
        },
        bullets: parseBullets(plan.bullets),
        badge: plan.badge,
        category: plan.category,
        imageUrl: plan.imageUrl,
        active: plan.active,
        visibleOnPricingPage: plan.visibleOnPricingPage,
        legacyTier: plan.legacyTier,
        prices: DURATIONS.map((duration) => {
          const price = plan.prices.find((row) => row.duration === duration);
          return {
            duration,
            pricePaise: price?.pricePaise ?? 0,
            mrpPaise: price?.mrpPaise ?? null,
            active: price?.active ?? false
          };
        })
      };
    })
  );
}

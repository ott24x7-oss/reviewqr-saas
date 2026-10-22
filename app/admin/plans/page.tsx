import { prisma } from "@/lib/db";
import { DURATIONS, parseLimits } from "@/lib/plans/catalog";
import { limitsForTier } from "@/lib/plans/legacy";
import { PlansBoard, type AdminPlan } from "./plans-board";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { prices: true }
  });
  const rows: AdminPlan[] = plans.map((plan) => {
    const limits = parseLimits(plan.limits, limitsForTier(plan.legacyTier));
    return {
      id: plan.id,
      nameEn: plan.nameEn,
      nameHi: plan.nameHi,
      slug: plan.slug,
      descriptionEn: plan.descriptionEn,
      descriptionHi: plan.descriptionHi,
      modules: plan.modules,
      limits: {
        businesses: limits.businesses,
        qrCodes: limits.qrCodes,
        products: limits.products,
        staff: limits.staff,
        aiCalls: limits.aiCalls
      },
      badge: plan.badge,
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
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Module plans</h1>
        <p className="text-sm text-muted-foreground">
          Build a plan or a combo by ticking modules. Archived plans stay on the accounts that already bought them.
          Drag a row to change the pricing-page order.
        </p>
      </div>
      <PlansBoard plans={rows} />
    </div>
  );
}

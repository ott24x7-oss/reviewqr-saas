import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { v1Data } from "@/lib/api/v1";
import { listPublicPlans } from "@/lib/plans/public";

export const dynamic = "force-dynamic";

/** Shows the plans the Android app can display. Purchase stays on the website. */
async function getHandler(_req: NextRequest) {
  const plans = await listPublicPlans();
  return v1Data({
    plans: plans.map((plan) => ({
      slug: plan.slug,
      nameEn: plan.nameEn,
      nameHi: plan.nameHi,
      descriptionEn: plan.descriptionEn,
      descriptionHi: plan.descriptionHi,
      badge: plan.badge,
      modules: plan.modules,
      tab: plan.tab,
      prices: plan.prices
    })),
    purchase: "web"
  });
}

export const GET = observe(getHandler);

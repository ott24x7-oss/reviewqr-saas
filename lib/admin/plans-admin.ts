import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import type { AdminPlanPatch } from "@reviewqr/shared";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { parseLimits } from "@/lib/plans/catalog";
import { updatePlanRecord, type PlanWriteInput } from "@/lib/plans/admin-write";
import { limitsForTier } from "@/lib/plans/legacy";

export function planPatchIsSensitive(body: { modules?: string[]; pricePaise?: number; mrpPaise?: number | null }) {
  return body.modules != null || body.pricePaise != null || body.mrpPaise !== undefined;
}

export async function listAdminPlans() {
  const plans = await prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }], include: { prices: true } });
  return ok({
    items: plans.map((plan) => ({
      id: plan.id,
      nameEn: plan.nameEn,
      nameHi: plan.nameHi,
      slug: plan.slug,
      descriptionEn: plan.descriptionEn,
      descriptionHi: plan.descriptionHi,
      modules: plan.modules,
      badge: plan.badge,
      sortOrder: plan.sortOrder,
      active: plan.active,
      visibleOnPricingPage: plan.visibleOnPricingPage,
      prices: plan.prices.map((price) => ({
        duration: price.duration,
        pricePaise: price.pricePaise,
        mrpPaise: price.mrpPaise,
        active: price.active
      }))
    }))
  });
}

export async function patchAdminPlan(id: string, body: AdminPlanPatch) {
  const plan = await prisma.plan.findUnique({ where: { id }, include: { prices: true } });
  if (!plan) return fail(404, "Plan not found");
  const base = await limitsForTier(plan.legacyTier);
  const limits = parseLimits(plan.limits, base);
  const prices = plan.prices.map((price) => ({
    duration: price.duration,
    pricePaise: price.pricePaise,
    mrpPaise: price.mrpPaise,
    active: price.active
  }));
  if (body.duration && (body.pricePaise != null || body.mrpPaise !== undefined)) {
    const current = prices.find((price) => price.duration === body.duration);
    if (current) {
      if (body.pricePaise != null) current.pricePaise = body.pricePaise;
      if (body.mrpPaise !== undefined) current.mrpPaise = body.mrpPaise;
      current.active = true;
    } else {
      prices.push({
        duration: body.duration,
        pricePaise: body.pricePaise ?? 0,
        mrpPaise: body.mrpPaise ?? null,
        active: true
      });
    }
  }
  const input: PlanWriteInput = {
    nameEn: plan.nameEn,
    nameHi: plan.nameHi,
    slug: plan.slug,
    descriptionEn: body.descriptionEn ?? plan.descriptionEn,
    descriptionHi: body.descriptionHi ?? plan.descriptionHi,
    modules: body.modules ?? plan.modules,
    limits: {
      businesses: limits.businesses,
      qrCodes: limits.qrCodes,
      products: limits.products,
      staff: limits.staff,
      aiCalls: limits.aiCalls
    },
    badge: body.badge === undefined ? plan.badge : body.badge,
    category: (plan.category as PlanWriteInput["category"]) || "reviews",
    imageUrl: plan.imageUrl,
    active: body.active ?? plan.active,
    visibleOnPricingPage: body.visibleOnPricingPage ?? plan.visibleOnPricingPage,
    legacyTier: plan.legacyTier as SubscriptionTier,
    prices
  };
  const saved = await updatePlanRecord(id, input);
  if (!saved.ok) return fail(400, saved.error);
  if (body.sortOrder != null) {
    await prisma.plan.update({ where: { id }, data: { sortOrder: body.sortOrder } });
  }
  return ok({
    before: { active: plan.active, visibleOnPricingPage: plan.visibleOnPricingPage, modules: plan.modules, prices: plan.prices },
    after: { id, active: input.active, visibleOnPricingPage: input.visibleOnPricingPage, modules: input.modules }
  });
}

export type { PlanDuration };

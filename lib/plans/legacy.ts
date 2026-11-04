/**
 * Legacy tier modules and limits are fallback defaults only. When a matching
 * Plan row exists, its current modules and limits define the tier's access.
 */
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { getPlan } from "../payments";
import { parseLimits, type PlanLimits } from "./catalog";

const TODAY_MODULES: Record<SubscriptionTier, string[]> = {
  FREE: ["REVIEWS", "MENU", "STORE"],
  STARTER: ["REVIEWS", "MENU", "STORE"],
  GROWTH: ["REVIEWS", "MENU", "STORE"],
  AGENCY: ["REVIEWS", "MENU", "STORE"],
  FOUNDER: ["REVIEWS", "MENU", "STORE"]
};

/** Defaults used only when no matching Plan row is available. */
export async function defaultLimitsForTier(tier: SubscriptionTier): Promise<PlanLimits> {
  const limits = (await getPlan(tier)).limits;
  return parseLimits(
    {
      ...limits,
      products: limits.storeProducts,
      aiCalls: limits.aiCallsPerMonth
    },
    {
      businesses: limits.businesses,
      qrCodes: limits.qrCodes,
      products: limits.storeProducts,
      staff: limits.staff,
      aiCalls: limits.aiCallsPerMonth,
      locations: limits.locations,
      reviews: limits.reviews,
      campaigns: limits.campaigns,
      reviewTemplates: limits.reviewTemplates,
      storeProducts: limits.storeProducts,
      storeOrders: limits.storeOrders,
      aiCallsPerMonth: limits.aiCallsPerMonth
    }
  );
}

/**
 * Resolve the editable tier row. Older databases may not have the canonical
 * id, so an active plan with the same legacy tier is the fallback.
 */
export async function findPlanForTier(tier: SubscriptionTier) {
  const legacy = await prisma.plan.findUnique({
    where: { id: legacyPlanId(tier) },
    select: { id: true, slug: true, nameEn: true, nameHi: true, modules: true, limits: true }
  });
  if (legacy) return legacy;
  return prisma.plan.findFirst({
    where: { active: true, legacyTier: tier },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, nameEn: true, nameHi: true, modules: true, limits: true }
  });
}

/** Current module and limit values for a tier, with old defaults as fallback. */
export async function planAccessForTier(tier: SubscriptionTier) {
  const [plan, defaults] = await Promise.all([findPlanForTier(tier), defaultLimitsForTier(tier)]);
  return {
    plan,
    modules: plan?.modules ?? TODAY_MODULES[tier],
    limits: plan ? parseLimits(plan.limits, defaults) : defaults
  };
}

export async function modulesForTier(tier: SubscriptionTier): Promise<string[]> {
  return (await planAccessForTier(tier)).modules;
}

export async function limitsForTier(tier: SubscriptionTier): Promise<PlanLimits> {
  return (await planAccessForTier(tier)).limits;
}

/** A missing catalogue row keeps its saved subscription snapshot as fallback. */
export function isCataloguePlan(planId: string | null | undefined) {
  return !!planId && !planId.startsWith("plan_legacy_");
}

export function legacyPlanId(tier: SubscriptionTier) {
  if (tier === "FREE") return "plan_legacy_free";
  if (tier === "STARTER") return "plan_legacy_starter";
  if (tier === "GROWTH") return "plan_legacy_growth";
  if (tier === "AGENCY") return "plan_legacy_agency";
  return "plan_legacy_founder";
}

export type SnapshotInput = {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  endsAt: Date | null;
  trialEndsAt?: Date | null;
  now?: Date;
};

/** A paid founder plan does not lapse. A trial uses trialEndsAt when no paid end is stored. */
export function legacyEndsAt(input: SnapshotInput) {
  if (input.tier === "FOUNDER" && input.status === "ACTIVE") return null;
  if (input.endsAt) return input.endsAt;
  if (input.status === "TRIALING") return input.trialEndsAt ?? null;
  return null;
}

export function snapshotGrants(input: {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  endsAt: Date | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (input.status === "CANCELED" || input.status === "EXPIRED") return false;
  if (input.tier === "FOUNDER" && input.status === "ACTIVE") return true;
  if (input.endsAt && input.endsAt.getTime() < now.getTime()) return false;
  return true;
}

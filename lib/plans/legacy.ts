/**
 * Old SubscriptionTier rows keep today's access.
 * FREE keeps reviews, the menu, and the store at today's free limits.
 * Every paid tier, including an active trial, keeps all modules.
 * A plan bought from the catalogue can omit a module. Legacy plan ids cannot.
 */
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { getPlan } from "../payments";
import { parseLimits, type PlanLimits } from "./catalog";

const TODAY_MODULES: Record<SubscriptionTier, string[]> = {
  FREE: ["REVIEWS", "MENU", "STORE"],
  STARTER: ["REVIEWS", "MENU", "STORE"],
  GROWTH: ["REVIEWS", "MENU", "STORE"],
  AGENCY: ["REVIEWS", "MENU", "STORE"],
  FOUNDER: ["REVIEWS", "MENU", "STORE"]
};

export function modulesForTier(tier: SubscriptionTier): string[] {
  return TODAY_MODULES[tier];
}

/** True when this subscription was bought from a plan that is not a legacy tier mirror. */
export function isCataloguePlan(planId: string | null | undefined) {
  return !!planId && !planId.startsWith("plan_legacy_");
}

/** Admin pricing limits when they are stored, otherwise today's catalogue defaults. */
export async function limitsForTier(tier: SubscriptionTier): Promise<PlanLimits> {
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

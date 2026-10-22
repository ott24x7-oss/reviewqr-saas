/**
 * Old SubscriptionTier rows keep today's access.
 * FREE is reviews only. Every paid tier, including an active trial, keeps all modules.
 */
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { DEFAULT_PLANS } from "../settings";
import { parseLimits, type PlanLimits } from "./catalog";

export function modulesForTier(tier: SubscriptionTier): string[] {
  if (tier === "FREE") return ["REVIEWS"];
  return ["REVIEWS", "MENU", "STORE"];
}

export function limitsForTier(tier: SubscriptionTier): PlanLimits {
  const limits = DEFAULT_PLANS[tier].limits;
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

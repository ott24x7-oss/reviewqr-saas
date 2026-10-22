import type { SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { legacyEndsAt, legacyPlanId, limitsForTier, modulesForTier } from "./legacy";

/**
 * Write the tier snapshot for an account that still has only the old columns.
 * Safe to call more than once. A row that already exists is left alone.
 */
export async function ensureLegacySubscription(userId: string) {
  const open = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } }
  });
  if (open) return open;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionEndsAt: true,
      trialEndsAt: true,
      createdAt: true
    }
  });
  if (!user) return null;
  const tier = user.subscriptionTier as SubscriptionTier;
  return prisma.subscription.create({
    data: {
      id: `legacy_${user.id}`,
      userId: user.id,
      planId: legacyPlanId(tier),
      modules: modulesForTier(tier),
      limits: limitsForTier(tier),
      tier,
      duration: tier === "FOUNDER" && user.subscriptionStatus === "ACTIVE" ? "LIFETIME" : null,
      status: user.subscriptionStatus,
      startsAt: user.createdAt,
      endsAt: legacyEndsAt({
        tier,
        status: user.subscriptionStatus,
        endsAt: user.subscriptionEndsAt,
        trialEndsAt: user.trialEndsAt
      }),
      pricePaise: 0,
      pendingModules: []
    }
  });
}

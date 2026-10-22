/**
 * One writer for the subscription snapshot.
 * YouPI activation, hardware bundles, admin edits, and referral rewards all use it.
 */
import { Prisma, type PlanDuration, type SubscriptionStatus, type SubscriptionTier } from "@prisma/client";
import { legacyPlanId, limitsForTier, modulesForTier } from "./legacy";

export type SnapshotWrite = {
  userId: string;
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  endsAt: Date | null;
  startsAt?: Date;
  planId?: string | null;
  duration?: PlanDuration | null;
  modules?: string[] | null;
  limits?: unknown;
  pricePaise?: number;
  /** Free days at the end of endsAt. Omit to keep the open snapshot's value. */
  bonusDays?: number;
  /** Add to the stored price instead of replacing it. */
  addPricePaise?: number;
  clearPending?: boolean;
  trialEndsAt?: Date | null;
  touchTrial?: boolean;
};

function asLimits(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function applySubscriptionSnapshot(tx: Prisma.TransactionClient, input: SnapshotWrite) {
  const open = await tx.subscription.findFirst({
    where: { userId: input.userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" }
  });
  const modules =
    input.modules && input.modules.length
      ? input.modules
      : open?.modules?.length
        ? open.modules
        : modulesForTier(input.tier);
  const limits =
    input.limits && typeof input.limits === "object"
      ? input.limits
      : open?.limits && typeof open.limits === "object"
        ? open.limits
        : await limitsForTier(input.tier);
  const pricePaise =
    input.addPricePaise != null
      ? Math.max(0, (open?.pricePaise || 0) + Math.floor(input.addPricePaise))
      : input.pricePaise != null
        ? Math.max(0, Math.floor(input.pricePaise))
        : open?.pricePaise || 0;
  const data = {
    planId: input.planId === undefined ? (open?.planId ?? legacyPlanId(input.tier)) : input.planId,
    modules,
    limits: asLimits(limits),
    tier: input.tier,
    duration: input.duration === undefined ? (open?.duration ?? null) : input.duration,
    status: input.status ?? open?.status ?? "ACTIVE",
    startsAt: input.startsAt ?? open?.startsAt ?? new Date(),
    endsAt: input.endsAt,
    pricePaise,
    bonusDays:
      input.bonusDays == null ? open?.bonusDays || 0 : Math.max(0, Math.floor(input.bonusDays)),
    ...(input.clearPending
      ? {
          pendingPlanId: null,
          pendingDuration: null,
          pendingModules: [] as string[],
          pendingLimits: Prisma.DbNull
        }
      : {})
  };
  if (open) return tx.subscription.update({ where: { id: open.id }, data });
  return tx.subscription.create({
    data: { userId: input.userId, pendingModules: [], ...data }
  });
}

/** A paid, cancelled, or abandoned change must not stay pending on an older row. */
export async function clearUserPending(tx: Prisma.TransactionClient, userId: string) {
  await tx.subscription.updateMany({
    where: { userId, pendingPlanId: { not: null } },
    data: {
      pendingPlanId: null,
      pendingDuration: null,
      pendingModules: [],
      pendingLimits: Prisma.DbNull
    }
  });
}

/** Updates the user columns and the open snapshot together. */
export async function grantPlanAccess(tx: Prisma.TransactionClient, input: SnapshotWrite) {
  await tx.user.update({
    where: { id: input.userId },
    data: {
      subscriptionTier: input.tier,
      subscriptionStatus: input.status ?? "ACTIVE",
      subscriptionEndsAt: input.endsAt,
      ...(input.touchTrial ? { trialEndsAt: input.trialEndsAt ?? null } : {})
    }
  });
  return applySubscriptionSnapshot(tx, input);
}

/** Admin tier and date edits. The snapshot uses that tier's modules and limits. */
export async function editUserSubscription(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    endsAt: Date | null;
  }
) {
  return applySubscriptionSnapshot(tx, {
    userId: input.userId,
    tier: input.tier,
    status: input.status,
    endsAt: input.endsAt,
    planId: legacyPlanId(input.tier),
    duration: input.tier === "FOUNDER" && input.status === "ACTIVE" ? "LIFETIME" : null,
    modules: modulesForTier(input.tier),
    limits: await limitsForTier(input.tier)
  });
}

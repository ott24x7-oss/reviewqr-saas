import { addMonths } from "date-fns";
import { prisma } from "../db";
import { durationMonths } from "./catalog";
import { grantPlanAccess } from "./snapshot";

/** When a period ends, the scheduled plan replaces the current snapshot. */
export async function applyDuePlanChanges(now = new Date()) {
  const due = await prisma.subscription.findMany({
    where: {
      pendingPlanId: { not: null },
      endsAt: { lte: now },
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }
    }
  });
  let applied = 0;
  for (const sub of due) {
    if (!sub.pendingPlanId || !sub.endsAt) continue;
    const plan = await prisma.plan.findUnique({
      where: { id: sub.pendingPlanId },
      include: { prices: true }
    });
    if (!plan) continue;
    const duration = sub.pendingDuration ?? "MONTH_1";
    const months = durationMonths(duration);
    const startsAt = sub.endsAt;
    const endsAt = months == null ? null : addMonths(startsAt, months);
    const price = plan.prices.find((row) => row.duration === duration && row.active);
    const limits =
      sub.pendingLimits && typeof sub.pendingLimits === "object" ? sub.pendingLimits : plan.limits;
    await prisma.$transaction((tx) =>
      grantPlanAccess(tx, {
        userId: sub.userId,
        tier: plan.legacyTier,
        status: "ACTIVE",
        endsAt,
        startsAt,
        planId: plan.id,
        duration,
        modules: sub.pendingModules.length ? sub.pendingModules : plan.modules,
        limits,
        pricePaise: price?.pricePaise ?? 0,
        clearPending: true
      })
    );
    applied += 1;
  }
  return applied;
}

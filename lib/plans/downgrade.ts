import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { durationMonths } from "./catalog";

/**
 * A scheduled downgrade does not grant the next plan.
 * When the current period ends, leave a YouPI invoice and a reminder.
 * The plan starts only after that invoice is paid.
 */
export async function applyDuePlanChanges(now = new Date(), userId?: string) {
  const due = await prisma.subscription.findMany({
    where: {
      ...(userId ? { userId } : {}),
      pendingPlanId: { not: null },
      endsAt: { lte: now },
      status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }
    }
  });
  let issued = 0;
  for (const sub of due) {
    if (!sub.pendingPlanId || !sub.endsAt) continue;
    const plan = await prisma.plan.findUnique({
      where: { id: sub.pendingPlanId },
      include: { prices: true }
    });
    if (!plan) continue;
    const duration = sub.pendingDuration ?? "MONTH_1";
    const price = plan.prices.find((row) => row.duration === duration && row.active);
    const amount = price?.pricePaise ?? 0;
    if (amount > 0) {
      const existing = await prisma.payment.findFirst({
        where: {
          userId: sub.userId,
          planId: plan.id,
          duration,
          provider: "YOUPI",
          status: { in: ["PENDING", "QUEUED"] }
        },
        select: { id: true }
      });
      if (!existing) {
        const months = durationMonths(duration);
        const limits =
          sub.pendingLimits && typeof sub.pendingLimits === "object" && !Array.isArray(sub.pendingLimits)
            ? sub.pendingLimits
            : plan.limits;
        await prisma.payment.create({
          data: {
            userId: sub.userId,
            amount,
            currency: "INR",
            status: "PENDING",
            provider: "YOUPI",
            tier: plan.legacyTier,
            periodMonths: months == null ? 0 : months,
            planId: plan.id,
            duration,
            modules: sub.pendingModules.length ? sub.pendingModules : plan.modules,
            limits: limits as Prisma.InputJsonValue,
            creditPaise: 0,
            // Same window as the pending plan itself: 30 days after the period ended.
            expiresAt: new Date(sub.endsAt.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        });
        issued += 1;
      }
    }
    try {
      await prisma.subscriptionReminder.create({
        data: { userId: sub.userId, kind: `pending:${plan.id}`, periodEnd: sub.endsAt }
      });
    } catch {
      // One reminder per period. A second cron run keeps the first row.
    }
  }
  return issued;
}

/** Drop a pending change that was cancelled or left unpaid for 30 days after the period ended. */
export async function clearStalePendingPlans(now = new Date(), userId?: string) {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.subscription.updateMany({
    where: {
      ...(userId ? { userId } : {}),
      pendingPlanId: { not: null },
      OR: [{ status: "CANCELED" }, { endsAt: { lt: cutoff } }]
    },
    data: {
      pendingPlanId: null,
      pendingDuration: null,
      pendingModules: [],
      pendingLimits: Prisma.DbNull
    }
  });
  return result.count;
}

import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { durationMonths } from "./catalog";
import { legacyPlanId, snapshotGrants } from "./legacy";
import { quotePlanChange, unusedPaidCredit, type PlanQuote } from "./quote";
import { openDuration } from "./open-duration";

export type CheckoutQuote =
  | {
      ok: true;
      planId: string;
      slug: string;
      name: string;
      tier: SubscriptionTier;
      duration: PlanDuration;
      months: number;
      modules: string[];
      limits: unknown;
      pricePaise: number;
      quote: PlanQuote;
    }
  | { ok: false; error: string };

export async function quotePlanCheckout(
  userId: string,
  slug: string,
  duration: PlanDuration,
  now = new Date()
): Promise<CheckoutQuote> {
  const plan = await prisma.plan.findUnique({
    where: { slug },
    include: { prices: true }
  });
  if (!plan || !plan.active) return { ok: false, error: "This plan is not available" };
  const price = plan.prices.find((row) => row.duration === duration && row.active);
  if (!price) return { ok: false, error: "That duration is not sold on this plan" };
  if (price.pricePaise <= 0) return { ok: false, error: "This plan is free" };

  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" }
  });
  const granting = !!sub && snapshotGrants({ tier: sub.tier, status: sub.status, endsAt: sub.endsAt, now });
  // Compare catalogue list prices (monthly equivalent), never the amount paid.
  // A trial or an unknown current plan counts as no plan: the purchase starts now.
  const currentDuration = granting ? await openDuration(prisma, sub) : null;
  let currentPrice = 0;
  if (granting && sub.status !== "TRIALING" && sub.planId && currentDuration) {
    const listed = await prisma.planPrice.findUnique({
      where: { planId_duration: { planId: sub.planId, duration: currentDuration } }
    });
    currentPrice = listed?.pricePaise ?? 0;
  }
  const credit = granting ? await paidValuePaise(sub, userId, now) : 0;
  const onPlan = granting && sub.status !== "TRIALING" && sub.planId === plan.id;
  const samePlan = onPlan && currentDuration === duration;
  const currentMonths = durationMonths(currentDuration) ?? 1;
  const quote = quotePlanChange({
    samePlan,
    currentPricePaise: currentPrice,
    targetPricePaise: price.pricePaise,
    creditPaise: credit,
    currentMonths,
    targetMonths: durationMonths(duration) ?? 1
  });
  const months = durationMonths(duration) ?? 0;
  // Same plan, other duration: switch at the end of the paid period.
  const switchDuration = onPlan && !samePlan;
  return {
    ok: true,
    planId: plan.id,
    slug: plan.slug,
    name: plan.nameEn,
    tier: plan.legacyTier,
    duration,
    months,
    modules: plan.modules,
    limits: plan.limits,
    pricePaise: price.pricePaise,
    quote: switchDuration ? { kind: "downgrade" as const, duePaise: 0, creditPaise: 0 } : quote
  };
}

async function paidValuePaise(
  sub: {
    planId: string | null;
    tier: SubscriptionTier;
    status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
    duration: PlanDuration | null;
    startsAt: Date;
    endsAt: Date | null;
    bonusDays: number;
  },
  userId: string,
  now: Date
) {
  if (sub.status === "TRIALING" || sub.tier === "FREE") return 0;
  const since = new Date(sub.startsAt.getTime() - 3 * 60 * 60 * 1000);
  const last = await prisma.payment.findFirst({
    where: {
      userId,
      status: "COMPLETED",
      amount: { gt: 0 },
      createdAt: { gte: since },
      OR: sub.planId ? [{ planId: sub.planId }, { planId: null, tier: sub.tier }] : [{ tier: sub.tier }]
    },
    orderBy: { createdAt: "desc" },
    select: { amount: true }
  });
  if (!last) return 0;
  return unusedPaidCredit({
    paidPaise: last.amount,
    startsAt: sub.startsAt,
    endsAt: sub.endsAt,
    bonusDays: sub.bonusDays,
    duration: sub.duration,
    now
  });
}

export async function scheduleDowngrade(userId: string, quote: Extract<CheckoutQuote, { ok: true }>) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" }
  });
  if (!sub) return { ok: false as const, error: "There is no active plan to change" };
  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      pendingPlanId: quote.planId,
      pendingDuration: quote.duration,
      pendingModules: quote.modules,
      pendingLimits: quote.limits as object
    }
  });
  return { ok: true as const };
}

import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import { prisma } from "../db";
import { durationMonths } from "./catalog";
import { legacyPlanId, snapshotGrants } from "./legacy";
import { creditBasePaise, inferDuration, prorateCredit, quotePlanChange, type PlanQuote } from "./quote";

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

export async function quotePlanCheckout(userId: string, slug: string, duration: PlanDuration): Promise<CheckoutQuote> {
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
  const granting = !!sub && snapshotGrants({ tier: sub.tier, status: sub.status, endsAt: sub.endsAt });
  let currentPrice = granting ? sub.pricePaise : 0;
  if (granting && currentPrice <= 0 && sub.planId) {
    const sameDuration = await prisma.planPrice.findUnique({
      where: { planId_duration: { planId: sub.planId, duration } }
    });
    currentPrice = sameDuration?.active ? sameDuration.pricePaise : 0;
  }
  const basis = granting ? await paidValuePaise(sub, userId) : 0;
  const credit = granting
    ? prorateCredit({ pricePaidPaise: basis, startsAt: sub.startsAt, endsAt: sub.endsAt })
    : 0;
  const samePlan = granting && sub.planId === plan.id && sub.duration === duration;
  const currentMonths = granting ? durationMonths(sub.duration ?? inferDuration(sub.startsAt, sub.endsAt)) ?? 1 : 1;
  const quote = quotePlanChange({
    samePlan,
    currentPricePaise: currentPrice,
    targetPricePaise: price.pricePaise,
    creditPaise: credit,
    currentMonths,
    targetMonths: durationMonths(duration) ?? 1
  });
  const months = durationMonths(duration) ?? 0;
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
    quote
  };
}

async function paidValuePaise(
  sub: {
    pricePaise: number;
    planId: string | null;
    tier: SubscriptionTier;
    duration: PlanDuration | null;
    startsAt: Date;
    endsAt: Date | null;
  },
  userId: string
) {
  const duration = sub.duration ?? inferDuration(sub.startsAt, sub.endsAt);
  const planId = sub.planId || legacyPlanId(sub.tier);
  const price = await prisma.planPrice.findUnique({
    where: { planId_duration: { planId, duration } }
  });
  let catalogue = price?.active ? price.pricePaise : 0;
  if (catalogue <= 0) {
    const monthly = await prisma.planPrice.findUnique({
      where: { planId_duration: { planId, duration: "MONTH_1" } }
    });
    const months = durationMonths(duration) ?? 1;
    catalogue = (monthly?.active ? monthly.pricePaise : 0) * months;
  }
  const last = await prisma.payment.findFirst({
    where: { userId, status: "COMPLETED", amount: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: { amount: true }
  });
  return creditBasePaise({
    snapshotPaise: sub.pricePaise,
    cataloguePaise: catalogue,
    lastPaymentPaise: last?.amount || 0
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

/**
 * Plan limits in one place. Counts use effectiveTier(), so an expired paid
 * plan is treated as Free. Callers should not read plan.limits themselves.
 */
import { prisma } from "./db";
import { effectiveTier, getPlan, type PlanInfo } from "./payments";
import { getAiConfig } from "./settings";
import type { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

export type LimitUser = {
  id: string;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
};

const IST = "Asia/Kolkata";

export function exceedsLimit(used: number, adding: number, limit: number) {
  return used + adding > limit;
}

function istParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Calendar month key in India, YYYY-MM. */
export function monthKey(now = new Date()) {
  const p = istParts(now);
  return `${p.year}-${p.month}`;
}

/** Calendar day key in India, YYYY-MM-DD. */
export function dayKey(now = new Date()) {
  const p = istParts(now);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Start of the current Indian calendar month, as a UTC instant. */
export function calendarMonthStart(now = new Date()) {
  const p = istParts(now);
  return new Date(`${p.year}-${p.month}-01T00:00:00+05:30`);
}

const LABELS: Record<keyof PlanInfo["limits"], string> = {
  businesses: "businesses",
  locations: "locations",
  staff: "staff",
  qrCodes: "QR codes",
  reviews: "reviews this month",
  aiCallsPerMonth: "AI calls this month",
  campaigns: "campaigns",
  reviewTemplates: "topic hints",
  storeProducts: "products",
  storeOrders: "orders"
};

export async function ownerLimitError(
  user: LimitUser,
  key: keyof PlanInfo["limits"],
  used: number,
  adding = 1
) {
  const tier = effectiveTier(user);
  const limit = (await getPlan(tier)).limits[key];
  if (!exceedsLimit(used, adding, limit)) return null;
  return `Your ${tier} plan allows ${limit} ${LABELS[key]}. Upgrade to add more.`;
}

export async function monthlyReviewCount(ownerId: string, now = new Date()) {
  return prisma.review.count({
    where: {
      business: { ownerId },
      createdAt: { gte: calendarMonthStart(now) }
    }
  });
}

export class AiQuotaError extends Error {
  constructor(public reason: "plan" | "daily_cap") {
    super(reason === "daily_cap" ? "AI daily cap reached" : "AI plan limit reached");
    this.name = "AiQuotaError";
  }
}

/** Reserve one AI call for a business. Throws AiQuotaError when a cap is hit. */
export async function consumeAiCall(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      owner: {
        select: {
          id: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          subscriptionEndsAt: true
        }
      }
    }
  });
  if (!business) throw new AiQuotaError("plan");

  const tier = effectiveTier(business.owner);
  const limit = (await getPlan(tier)).limits.aiCallsPerMonth;
  const cfg = await getAiConfig();
  const month = monthKey();
  const day = dayKey();
  const estimate = cfg.estimatePaisePerCall;
  const cap = cfg.dailyCapPaise;

  await prisma.$transaction(async (tx) => {
    const spend = await tx.platformAiSpend.findUnique({ where: { day } });
    if ((spend?.paise ?? 0) + estimate > cap) throw new AiQuotaError("daily_cap");

    const usage = await tx.aiUsage.findUnique({
      where: { businessId_month: { businessId, month } }
    });
    if ((usage?.calls ?? 0) >= limit) throw new AiQuotaError("plan");

    await tx.aiUsage.upsert({
      where: { businessId_month: { businessId, month } },
      create: { businessId, month, calls: 1 },
      update: { calls: { increment: 1 } }
    });
    await tx.platformAiSpend.upsert({
      where: { day },
      create: { day, paise: estimate },
      update: { paise: { increment: estimate } }
    });
  });
}

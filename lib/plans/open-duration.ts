import type { PlanDuration, Prisma, SubscriptionTier } from "@prisma/client";
import { legacyPlanId } from "./legacy";
import { inferDuration } from "./quote";

type PaymentReader = { payment: Pick<Prisma.TransactionClient["payment"], "findFirst"> };

export function durationForMonths(months: number | null | undefined): PlanDuration | null {
  if (months === 12) return "YEAR_1";
  if (months === 6) return "MONTH_6";
  if (months === 1) return "MONTH_1";
  if (months === 0) return "LIFETIME";
  return null;
}

/**
 * Migrated subscriptions have no duration and start at account creation, so
 * the dates alone can't tell monthly from yearly. Prefer the last real payment.
 */
export async function openDuration(
  db: PaymentReader,
  sub: { userId: string; duration: PlanDuration | null; startsAt: Date; endsAt: Date | null }
): Promise<PlanDuration> {
  if (sub.duration) return sub.duration;
  const last = await db.payment.findFirst({
    where: { userId: sub.userId, status: "COMPLETED", amount: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    select: { duration: true, periodMonths: true }
  });
  return last?.duration ?? durationForMonths(last?.periodMonths) ?? inferDuration(sub.startsAt, sub.endsAt);
}

/** A payment from the manual UPI, USDT or Razorpay routes names a tier, not a plan. */
export function paymentPlan(row: {
  planId: string | null;
  duration: PlanDuration | null;
  tier: SubscriptionTier | null;
  periodMonths: number | null;
}) {
  const planId = row.planId ?? (row.tier && row.tier !== "FREE" ? legacyPlanId(row.tier) : null);
  const duration = row.duration ?? durationForMonths(row.periodMonths);
  return { planId, duration };
}

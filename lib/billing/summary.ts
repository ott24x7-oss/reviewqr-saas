import { prisma } from "../db";
import { fail, ok } from "../api/result";

/** Plan, expiry, and payment history. This does not start a purchase. */
export async function billingSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionStatus: true, trialEndsAt: true, subscriptionEndsAt: true }
  });
  if (!user) return fail(401, "Sign in required");
  const payments = await prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, amount: true, currency: true, status: true, tier: true, invoiceNumber: true, createdAt: true }
  });
  return ok({
    plan: {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
      subscriptionEndsAt: user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString() : null
    },
    history: payments.map((row) => ({
      id: row.id,
      amountPaise: row.amount,
      currency: row.currency,
      status: row.status,
      tier: row.tier,
      invoiceNumber: row.invoiceNumber,
      createdAt: row.createdAt.toISOString()
    }))
  });
}

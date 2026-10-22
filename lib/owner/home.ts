import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { readableBusinessWhere, requireBusinessRole } from "../tenant";

function startOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Today's orders, feedback, and scans, plus the plan the app is allowed to show. */
export async function ownerHome(userId: string, businessId: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      subscriptionEndsAt: true
    }
  });
  if (!user) return fail(401, "Sign in required");
  if (businessId) {
    const access = await requireBusinessRole(userId, businessId, "read");
    if (!access) return fail(404, "Not found");
  }

  const businesses = businessId
    ? [{ id: businessId }]
    : await prisma.business.findMany({
        where: readableBusinessWhere(userId),
        select: { id: true }
      });
  const ids = businesses.map((row) => row.id);
  const start = startOfToday();
  const [ordersToday, feedbackToday, scansToday] = ids.length
    ? await Promise.all([
        prisma.menuOrder.count({ where: { businessId: { in: ids }, createdAt: { gte: start } } }),
        prisma.feedback.count({ where: { businessId: { in: ids }, createdAt: { gte: start } } }),
        prisma.qrScan.count({
          where: { createdAt: { gte: start }, qrCode: { businessId: { in: ids } } }
        })
      ])
    : [0, 0, 0];

  return ok({
    ordersToday,
    feedbackToday,
    scansToday,
    businessId,
    plan: {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
      subscriptionEndsAt: user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString() : null
    }
  });
}

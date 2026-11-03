import { prisma } from "../db";
import { fail, ok } from "../api/result";
import { countBookingsToday } from "../store/bookings";
import { readableBusinessWhere, requireBusinessRole } from "../tenant";
import { istDayKey, istDayRange } from "../analytics/ist";

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
  const { start, end } = istDayRange(istDayKey(new Date()));
  const [ordersToday, feedbackToday, scansToday, bookings] = await Promise.all([
    ids.length
      ? prisma.menuOrder.count({ where: { businessId: { in: ids }, createdAt: { gte: start, lt: end } } })
      : Promise.resolve(0),
    ids.length
      ? prisma.feedback.count({ where: { businessId: { in: ids }, createdAt: { gte: start, lt: end } } })
      : Promise.resolve(0),
    ids.length
      ? prisma.qrScan.count({
          where: { createdAt: { gte: start, lt: end }, qrCode: { businessId: { in: ids } } }
        })
      : Promise.resolve(0),
    countBookingsToday(ids)
  ]);

  return ok({
    ordersToday,
    feedbackToday,
    scansToday,
    bookingsToday: bookings.count,
    todayBookings: bookings.items.map((item) => ({
      id: item.id,
      customerName: item.customerName,
      serviceName: item.serviceName,
      timeLabel: item.timeLabel,
      status: item.status
    })),
    businessId,
    plan: {
      tier: user.subscriptionTier,
      status: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
      subscriptionEndsAt: user.subscriptionEndsAt ? user.subscriptionEndsAt.toISOString() : null
    }
  });
}

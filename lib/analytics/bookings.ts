import { prisma } from "../db";
import { istDayRange, istDayStart } from "./ist";

/** Bookings by service and the share of menu-item views that became a request. */
export async function bookingAnalytics(businessId: string, from: string, to: string) {
  const start = istDayStart(from);
  const end = istDayRange(to).end;
  const [views, grouped] = await Promise.all([
    prisma.menuItemView.count({ where: { businessId, createdAt: { gte: start, lt: end } } }),
    prisma.bookingRequest.groupBy({
      by: ["itemId"],
      where: { businessId, createdAt: { gte: start, lt: end } },
      _count: { id: true }
    })
  ]);
  const count = grouped.reduce((sum, row) => sum + row._count.id, 0);
  const names = grouped.length
    ? await prisma.menuItem.findMany({
        where: { id: { in: grouped.map((row) => row.itemId) } },
        select: { id: true, name: true }
      })
    : [];
  const byId = new Map(names.map((row) => [row.id, row.name]));
  return {
    count,
    byService: grouped
      .map((row) => ({ itemId: row.itemId, name: byId.get(row.itemId) || "Service", count: row._count.id }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
    conversion: views === 0 ? null : Math.round((count / views) * 1000) / 10
  };
}

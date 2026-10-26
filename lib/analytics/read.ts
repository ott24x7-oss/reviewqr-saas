import { rateLimitDb } from "../rate-limit";
import { featureBlock } from "../plans/feature-gate";
import { hasModule } from "../plans/entitlements";
import { requireBusinessRole } from "../tenant";
import { ensureRollups } from "./build";
import { compareSummaries, foldRange } from "./fold";
import { FutureRangeError, resolveRange } from "./range";

function clickTotal(clicks: Record<string, number>) {
  return Object.values(clicks).reduce((sum, count) => sum + count, 0);
}

export async function readBusinessAnalytics(
  userId: string,
  businessId: string,
  query: { preset?: string | null; from?: string | null; to?: string | null; now?: Date }
) {
  const access = await requireBusinessRole(userId, businessId, "read");
  if (!access) return { ok: false as const, status: 404, error: "Business not found" };
  const blocked = await featureBlock(access.ownerId, "analytics");
  if (blocked) return blocked;
  let range;
  try {
    range = resolveRange(query);
  } catch (error) {
    if (error instanceof FutureRangeError) return { ok: false as const, status: 400, error: error.message };
    throw error;
  }
  const limit = await rateLimitDb({ key: `analytics-read:${userId}`, limit: 60, windowSeconds: 60 });
  if (!limit.ok) return { ok: false as const, status: 429, error: "Too many requests" };
  const [menu, store, currentDays, previousDays] = await Promise.all([
    hasModule(access.ownerId, "MENU"),
    hasModule(access.ownerId, "STORE"),
    ensureRollups(businessId, range.from, range.to),
    ensureRollups(businessId, range.previousFrom, range.previousTo)
  ]);
  const current = foldRange(currentDays);
  const previous = foldRange(previousDays);
  const change = compareSummaries(current, previous);
  return {
    ok: true as const,
    data: {
      businessId,
      businessName: access.name,
      range,
      modules: { menu, store },
      summary: {
        scans: current.scans,
        tapsNfc: current.tapsNfc,
        tapsQr: current.tapsQr,
        pageViews: current.pageViews,
        buttonClicks: clickTotal(current.buttonClicks),
        orders: store ? current.orderCount : null,
        orderPaise: store ? current.orderPaise : null,
        feedback: current.feedbackCount,
        avgRating: current.avgRating
      },
      change: {
        ...change,
        orders: store ? change.orders : null,
        orderPaise: store ? change.orderPaise : null
      },
      buttonClicks: current.buttonClicks,
      trend: current.trend.map((row) => ({
        day: row.day,
        scans: row.scans,
        pageViews: row.pageViews,
        orders: store ? row.orders : null
      })),
      ratings: current.ratings,
      topItems: menu ? current.topItems : [],
      heatmap: current.heatmap,
      byQr: current.byQr,
      byDevice: current.byDevice,
      byTable: current.byTable,
      byStaff: current.byStaff
    }
  };
}

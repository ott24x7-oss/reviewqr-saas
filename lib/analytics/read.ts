import { hasModule } from "../plans/entitlements";
import { requireBusinessRole } from "../tenant";
import { ensureRollups } from "./build";
import { compareSummaries, foldRange } from "./fold";
import { resolveRange } from "./range";

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
  const range = resolveRange(query);
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

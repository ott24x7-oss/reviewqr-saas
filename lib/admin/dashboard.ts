import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { agentLeaderboard } from "@/lib/plans/admin-team";
import { indiaMonthRange } from "@/lib/plans/india";
import { activationStats, planMix, revenueBreakdown } from "./dashboard-math";
import { adminWindow, dayKey, eachDay } from "./range";

const DAY = 24 * 60 * 60 * 1000;

function fill(days: string[], map: Map<string, number>) {
  return days.map((day) => map.get(day) || 0);
}

function previousMonth(month: string) {
  const [year, value] = month.split("-").map(Number);
  const priorYear = value === 1 ? year - 1 : year;
  const priorMonth = value === 1 ? 12 : value - 1;
  return `${priorYear}-${String(priorMonth).padStart(2, "0")}`;
}

async function firstPaymentsInRange(rows: Array<{ id: string; userId: string; createdAt: Date }>, before: Date) {
  const ids = [...new Set(rows.map((row) => row.userId))];
  const earlier = ids.length
    ? await prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { lt: before }, userId: { in: ids } },
        select: { userId: true },
        distinct: ["userId"]
      })
    : [];
  const paidBefore = new Set(earlier.map((row) => row.userId));
  const seen = new Set(paidBefore);
  const firstIds = new Set<string>();
  for (const row of [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    firstIds.add(row.id);
  }
  return firstIds;
}

async function dashboardLeaderboard(month: string) {
  const range = indiaMonthRange(month);
  const priorRange = indiaMonthRange(previousMonth(month));
  const board = await agentLeaderboard(month);
  const top = board.rows.slice(0, 8);
  const ids = top.map((row) => row.agentId);
  const [previousRows, recentRows, users] = await Promise.all([
    prisma.shopCommission.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: priorRange.start, lt: priorRange.end }, status: { not: "REVERSED" } },
      _sum: { amountPaise: true }
    }),
    ids.length
      ? prisma.shopCommission.findMany({
          where: { agentId: { in: ids }, createdAt: { gte: range.start, lt: range.end }, status: { not: "REVERSED" } },
          select: { agentId: true, amountPaise: true, createdAt: true }
        })
      : Promise.resolve([]),
    ids.length ? prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, image: true } }) : Promise.resolve([])
  ]);
  const previousRank = new Map(previousRows
    .map((row) => ({ id: row.agentId, amount: row._sum.amountPaise || 0 }))
    .sort((a, b) => b.amount - a.amount)
    .map((row, index) => [row.id, index + 1] as const));
  const avatars = new Map(users.map((row) => [row.id, row.image]));
  const weekly = new Map<string, number[]>();
  const monthLength = Math.max(DAY, range.end.getTime() - range.start.getTime());
  for (const row of recentRows) {
    const points = weekly.get(row.agentId) || Array.from({ length: 7 }, () => 0);
    const bucket = Math.min(6, Math.floor(((row.createdAt.getTime() - range.start.getTime()) / monthLength) * 7));
    points[bucket] += row.amountPaise;
    weekly.set(row.agentId, points);
  }
  return {
    label: board.label,
    rows: top.map((row, index) => ({
      ...row,
      avatar: avatars.get(row.agentId) || null,
      rankChange: previousRank.has(row.agentId) ? (previousRank.get(row.agentId) || index + 1) - (index + 1) : null,
      series: weekly.get(row.agentId) || Array.from({ length: 7 }, () => 0)
    }))
  };
}

export async function loadAdminDashboard(search: URLSearchParams) {
  const parsed = adminWindow(search);
  if (!parsed.ok) return fail(400, parsed.error);
  const window = parsed.window;
  const now = new Date();
  const days = eachDay(window.start, window.end);
  const prevDays = eachDay(window.prevStart, window.prevEnd);

  const [paidRows, prevPaidRows, signups, prevSignups, scans, prevScans, shopRows, prevShopRows, refunds, prevRefunds, subs, churned, expiring, activeSubs, trials] =
    await Promise.all([
      prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { gte: window.start, lt: window.end } },
        select: { id: true, amount: true, createdAt: true, userId: true }
      }),
      prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { gte: window.prevStart, lt: window.prevEnd } },
        select: { id: true, amount: true, createdAt: true, userId: true }
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: window.start, lt: window.end }, deletedAt: null },
        select: { createdAt: true, _count: { select: { businesses: true } } }
      }),
      prisma.user.count({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd }, deletedAt: null } }),
      prisma.analyticsDaily.findMany({
        where: { day: { gte: window.start, lt: window.end } },
        select: { day: true, scans: true }
      }),
      prisma.analyticsDaily.findMany({
        where: { day: { gte: window.prevStart, lt: window.prevEnd } },
        select: { day: true, scans: true }
      }),
      prisma.shopOrder.findMany({ where: { createdAt: { gte: window.start, lt: window.end } }, select: { createdAt: true } }),
      prisma.shopOrder.findMany({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd } }, select: { createdAt: true } }),
      prisma.shopCreditNote.findMany({ where: { createdAt: { gte: window.start, lt: window.end } }, select: { amountPaise: true, createdAt: true } }),
      prisma.shopCreditNote.findMany({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd } }, select: { amountPaise: true, createdAt: true } }),
      prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        select: { planId: true, pricePaise: true, duration: true, status: true, plan: { select: { nameEn: true } } }
      }),
      prisma.subscription.count({
        where: { status: { in: ["CANCELED", "EXPIRED"] }, updatedAt: { gte: window.start, lt: window.end } }
      }),
      prisma.subscription.count({
        where: { status: "ACTIVE", endsAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) } }
      }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "TRIALING" } })
    ]);

  const revenueMap = new Map<string, number>();
  const paymentCountMap = new Map<string, number>();
  const revenuePaise = paidRows.reduce((sum, row) => sum + row.amount, 0);
  for (const row of paidRows) {
    const key = dayKey(row.createdAt);
    revenueMap.set(key, (revenueMap.get(key) || 0) + row.amount);
    paymentCountMap.set(key, (paymentCountMap.get(key) || 0) + 1);
  }
  const previousMap = new Map<string, number>();
  for (const row of prevPaidRows) {
    const key = dayKey(row.createdAt);
    previousMap.set(key, (previousMap.get(key) || 0) + row.amount);
  }
  const signupMap = new Map<string, number>();
  for (const row of signups) {
    const key = dayKey(row.createdAt);
    signupMap.set(key, (signupMap.get(key) || 0) + 1);
  }
  const shopMap = new Map<string, number>();
  for (const row of shopRows) {
    const key = dayKey(row.createdAt);
    shopMap.set(key, (shopMap.get(key) || 0) + 1);
  }
  const scanMap = new Map<string, number>();
  const scanTotal = scans.reduce((sum, row) => {
    const key = dayKey(row.day);
    scanMap.set(key, (scanMap.get(key) || 0) + row.scans);
    return sum + row.scans;
  }, 0);
  const prevScanTotal = prevScans.reduce((sum, row) => sum + row.scans, 0);

  const firstPaymentIds = await firstPaymentsInRange(paidRows, window.start);
  const prevFirstPaymentIds = await firstPaymentsInRange(prevPaidRows, window.prevStart);
  const firstPaymentMap = new Map<string, number>();
  const currentRowsById = new Map(paidRows.map((row) => [row.id, row]));
  for (const id of firstPaymentIds) {
    const row = currentRowsById.get(id);
    if (!row) continue;
    const key = dayKey(row.createdAt);
    firstPaymentMap.set(key, (firstPaymentMap.get(key) || 0) + 1);
  }
  const previousRevenuePaise = prevPaidRows.reduce((sum, row) => sum + row.amount, 0);
  const refundsPaise = refunds.reduce((sum, row) => sum + row.amountPaise, 0);
  const previousRefundsPaise = prevRefunds.reduce((sum, row) => sum + row.amountPaise, 0);
  const waterfall = revenueBreakdown(paidRows, firstPaymentIds, refundsPaise);
  const activation = activationStats(signups.map((row) => ({ hasBusiness: row._count.businesses > 0 })));
  const mixRows = planMix(subs.map((row) => ({
    planId: row.planId,
    name: row.plan?.nameEn || "Custom",
    status: row.status,
    pricePaise: row.pricePaise,
    duration: row.duration
  })));
  const mrrPaise = mixRows.reduce((sum, row) => sum + row.mrrPaise, 0);

  let whatsapp = "idle";
  try {
    const { getBaileys } = await import("@/lib/whatsapp-baileys");
    whatsapp = getBaileys().getInfo().status;
  } catch {
    whatsapp = "idle";
  }
  const [beat, reconcile, lastPayment, failedJobs, doneJobs] = await Promise.all([
    prisma.workerHeartbeat.findFirst({ orderBy: { seenAt: "desc" } }),
    prisma.job.findFirst({
      where: { type: "billing.reconcile", status: "DONE" },
      orderBy: { finishedAt: "desc" },
      select: { finishedAt: true }
    }),
    prisma.payment.findFirst({
      where: { status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    }),
    prisma.job.count({ where: { status: "FAILED", updatedAt: { gte: window.start, lt: window.end } } }),
    prisma.job.count({ where: { status: "DONE", updatedAt: { gte: window.start, lt: window.end } } })
  ]);
  const jobTotal = failedJobs + doneJobs;
  const month = dayKey(new Date(window.end.getTime() - DAY)).slice(0, 7);
  const leaderboard = await dashboardLeaderboard(month);

  return ok({
    range: window.label,
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    kpis: {
      revenuePaise,
      previousRevenuePaise,
      newPaid: firstPaymentIds.size,
      previousNewPaid: prevFirstPaymentIds.size,
      mrrPaise,
      arrPaise: mrrPaise * 12,
      activeSubs,
      trials,
      expiring,
      churned,
      signups: signups.length,
      previousSignups: prevSignups,
      scans: scanTotal,
      previousScans: prevScanTotal,
      shopOrders: shopRows.length,
      previousShopOrders: prevShopRows.length,
      refundsPaise,
      previousRefundsPaise
    },
    waterfall,
    activation,
    funnel: [
      { name: "Signups", value: signups.length },
      { name: "Added a business", value: activation.activated },
      { name: "First payment", value: firstPaymentIds.size }
    ],
    series: {
      days,
      revenue: fill(days, revenueMap),
      previousRevenue: fill(prevDays, previousMap),
      signups: fill(days, signupMap),
      paymentCount: fill(days, paymentCountMap),
      newPaid: fill(days, firstPaymentMap),
      previousNewPaid: prevFirstPaymentIds.size,
      shopOrders: fill(days, shopMap),
      scans: fill(days, scanMap)
    },
    planMix: mixRows,
    leaderboard,
    health: {
      whatsapp,
      lastPaymentAt: lastPayment?.updatedAt.toISOString() || null,
      lastReconcileAt: reconcile?.finishedAt?.toISOString() || beat?.seenAt.toISOString() || null,
      errorRate: jobTotal ? Math.round((failedJobs / jobTotal) * 1000) / 1000 : 0
    }
  });
}

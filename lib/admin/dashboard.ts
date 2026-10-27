import { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { agentLeaderboard } from "@/lib/plans/admin-team";
import { indiaMonthRange } from "@/lib/plans/india";
import { planMix } from "./dashboard-math";
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

type DayRow = { day: string; count: number | bigint; amount: number | bigint | null };

/** The India calendar day of a timestamp column, as YYYY-MM-DD, to match dayKey(). */
const IST_DAY = Prisma.sql`to_char(date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD')`;

/** A UTC wall-clock timestamp, whatever the session time zone, to compare with Prisma timestamp columns. */
function utc(value: Date) {
  return Prisma.sql`(${value.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

function dayMaps(rows: DayRow[]) {
  const count = new Map<string, number>();
  const amount = new Map<string, number>();
  for (const row of rows) {
    count.set(row.day, Number(row.count));
    amount.set(row.day, Number(row.amount ?? 0));
  }
  return { count, amount };
}

function mapTotal(map: Map<string, number>) {
  let total = 0;
  for (const value of map.values()) total += value;
  return total;
}

/** Paid payments per India day: how many and how much. */
function paidByDay(start: Date, end: Date) {
  return prisma.$queryRaw<DayRow[]>`
    SELECT ${IST_DAY} AS day, COUNT(*)::int AS count, COALESCE(SUM("amount"), 0)::bigint AS amount
    FROM "Payment"
    WHERE "status" = 'COMPLETED' AND "amount" > 0 AND "createdAt" >= ${utc(start)} AND "createdAt" < ${utc(end)}
    GROUP BY 1
  `;
}

/**
 * Each payer's first paid payment (earliest createdAt, then id), counted per India day
 * when it falls inside the range. One query, no per-user id list.
 */
function firstPaidByDay(start: Date, end: Date) {
  return prisma.$queryRaw<DayRow[]>`
    WITH first AS (
      SELECT DISTINCT ON ("userId") "amount", "createdAt"
      FROM "Payment"
      WHERE "status" = 'COMPLETED' AND "amount" > 0 AND "createdAt" < ${utc(end)}
      ORDER BY "userId", "createdAt", "id"
    )
    SELECT ${IST_DAY} AS day, COUNT(*)::int AS count, COALESCE(SUM("amount"), 0)::bigint AS amount
    FROM first
    WHERE "createdAt" >= ${utc(start)}
    GROUP BY 1
  `;
}

/** Signups per India day. amount holds how many of them added a business. */
function signupsByDay(start: Date, end: Date) {
  return prisma.$queryRaw<DayRow[]>`
    SELECT ${IST_DAY} AS day,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Business" b WHERE b."ownerId" = u."id"))::int AS amount
    FROM "User" u
    WHERE u."deletedAt" IS NULL AND u."createdAt" >= ${utc(start)} AND u."createdAt" < ${utc(end)}
    GROUP BY 1
  `;
}

function shopOrdersByDay(start: Date, end: Date) {
  return prisma.$queryRaw<DayRow[]>`
    SELECT ${IST_DAY} AS day, COUNT(*)::int AS count, NULL::bigint AS amount
    FROM "ShopOrder"
    WHERE "createdAt" >= ${utc(start)} AND "createdAt" < ${utc(end)}
    GROUP BY 1
  `;
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

  const [paid, prevPaid, firstPaid, prevFirstPaid, signupDays, prevSignups, scans, prevScans, shopDays, prevShopOrders, refunds, prevRefunds, subGroups, churned, expiring, activeSubs, trials] =
    await Promise.all([
      paidByDay(window.start, window.end),
      paidByDay(window.prevStart, window.prevEnd),
      firstPaidByDay(window.start, window.end),
      firstPaidByDay(window.prevStart, window.prevEnd),
      signupsByDay(window.start, window.end),
      prisma.user.count({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd }, deletedAt: null } }),
      prisma.analyticsDaily.groupBy({
        by: ["day"],
        where: { day: { gte: window.start, lt: window.end } },
        _sum: { scans: true }
      }),
      prisma.analyticsDaily.aggregate({
        where: { day: { gte: window.prevStart, lt: window.prevEnd } },
        _sum: { scans: true }
      }),
      shopOrdersByDay(window.start, window.end),
      prisma.shopOrder.count({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd } } }),
      prisma.shopCreditNote.aggregate({ where: { createdAt: { gte: window.start, lt: window.end } }, _sum: { amountPaise: true } }),
      prisma.shopCreditNote.aggregate({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd } }, _sum: { amountPaise: true } }),
      prisma.subscription.groupBy({
        by: ["planId", "status", "pricePaise", "duration"],
        where: { status: { in: ["ACTIVE", "TRIALING"] } },
        _count: { _all: true }
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

  const paidMaps = dayMaps(paid);
  const revenueMap = paidMaps.amount;
  const paymentCountMap = paidMaps.count;
  const revenuePaise = mapTotal(revenueMap);
  const previousMap = dayMaps(prevPaid).amount;
  const previousRevenuePaise = mapTotal(previousMap);
  const firstMaps = dayMaps(firstPaid);
  const firstPaymentMap = firstMaps.count;
  const newPaid = mapTotal(firstPaymentMap);
  const newPaise = mapTotal(firstMaps.amount);
  const previousNewPaid = mapTotal(dayMaps(prevFirstPaid).count);
  const signupMaps = dayMaps(signupDays);
  const signupMap = signupMaps.count;
  const signupCount = mapTotal(signupMap);
  const activated = mapTotal(signupMaps.amount);
  const shopMap = dayMaps(shopDays).count;
  const shopOrders = mapTotal(shopMap);
  const scanMap = new Map<string, number>();
  const scanTotal = scans.reduce((sum, row) => {
    const key = dayKey(row.day);
    const value = row._sum.scans || 0;
    scanMap.set(key, (scanMap.get(key) || 0) + value);
    return sum + value;
  }, 0);
  const prevScanTotal = prevScans._sum.scans || 0;

  const refundsPaise = refunds._sum.amountPaise || 0;
  const previousRefundsPaise = prevRefunds._sum.amountPaise || 0;
  const waterfall = {
    newPaise,
    renewalPaise: revenuePaise - newPaise,
    refundPaise: refundsPaise,
    netPaise: revenuePaise - refundsPaise
  };
  const activation = {
    activated,
    total: signupCount,
    rate: signupCount ? Math.round((activated / signupCount) * 100) : 0
  };
  const planIds = [...new Set(subGroups.flatMap((row) => (row.planId ? [row.planId] : [])))];
  const planNames = new Map(
    (planIds.length ? await prisma.plan.findMany({ where: { id: { in: planIds } }, select: { id: true, nameEn: true } }) : [])
      .map((plan) => [plan.id, plan.nameEn] as const)
  );
  const mixRows = planMix(subGroups.map((row) => ({
    planId: row.planId,
    name: (row.planId && planNames.get(row.planId)) || "Custom",
    status: row.status,
    pricePaise: row.pricePaise,
    duration: row.duration,
    count: row._count._all
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
      newPaid,
      previousNewPaid,
      mrrPaise,
      arrPaise: mrrPaise * 12,
      activeSubs,
      trials,
      expiring,
      churned,
      signups: signupCount,
      previousSignups: prevSignups,
      scans: scanTotal,
      previousScans: prevScanTotal,
      shopOrders,
      previousShopOrders: prevShopOrders,
      refundsPaise,
      previousRefundsPaise
    },
    waterfall,
    activation,
    funnel: [
      { name: "Signups", value: signupCount },
      { name: "Added a business", value: activation.activated },
      { name: "First payment", value: newPaid }
    ],
    series: {
      days,
      revenue: fill(days, revenueMap),
      previousRevenue: fill(prevDays, previousMap),
      signups: fill(days, signupMap),
      paymentCount: fill(days, paymentCountMap),
      newPaid: fill(days, firstPaymentMap),
      previousNewPaid,
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

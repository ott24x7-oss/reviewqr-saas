import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { agentLeaderboard } from "@/lib/plans/admin-team";
import { adminWindow, dayKey, eachDay } from "./range";

const DAY = 24 * 60 * 60 * 1000;

function monthly(pricePaise: number, duration: string | null) {
  if (duration === "YEAR_1") return Math.round(pricePaise / 12);
  if (duration === "MONTH_6") return Math.round(pricePaise / 6);
  if (duration === "LIFETIME") return 0;
  return pricePaise;
}

function fill(days: string[], map: Map<string, number>) {
  return days.map((day) => map.get(day) || 0);
}

export async function loadAdminDashboard(search: URLSearchParams) {
  const parsed = adminWindow(search);
  if (!parsed.ok) return fail(400, parsed.error);
  const window = parsed.window;
  const now = new Date();
  const days = eachDay(window.start, window.end);
  const prevDays = eachDay(window.prevStart, window.prevEnd);

  const [paidRows, prevPaid, signups, prevSignups, scans, shopRows, subs, churned, expiring, activeSubs, trials] =
    await Promise.all([
      prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { gte: window.start, lt: window.end } },
        select: { amount: true, createdAt: true, userId: true }
      }),
      prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { gte: window.prevStart, lt: window.prevEnd } },
        select: { amount: true, createdAt: true }
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: window.start, lt: window.end }, deletedAt: null },
        select: { createdAt: true }
      }),
      prisma.user.count({ where: { createdAt: { gte: window.prevStart, lt: window.prevEnd }, deletedAt: null } }),
      prisma.analyticsDaily.findMany({
        where: { day: { gte: window.start, lt: window.end } },
        select: { day: true, scans: true }
      }),
      prisma.shopOrder.findMany({
        where: { createdAt: { gte: window.start, lt: window.end } },
        select: { createdAt: true }
      }),
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
  const paidMap = new Map<string, number>();
  let revenuePaise = 0;
  for (const row of paidRows) {
    revenuePaise += row.amount;
    const key = dayKey(row.createdAt);
    revenueMap.set(key, (revenueMap.get(key) || 0) + row.amount);
    paidMap.set(key, (paidMap.get(key) || 0) + 1);
  }
  const previousMap = new Map<string, number>();
  for (const row of prevPaid) {
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
  let scanTotal = 0;
  for (const row of scans) {
    const key = dayKey(row.day);
    scanMap.set(key, (scanMap.get(key) || 0) + row.scans);
    scanTotal += row.scans;
  }

  const payerIds = [...new Set(paidRows.map((row) => row.userId))];
  const earlier = payerIds.length
    ? await prisma.payment.findMany({
        where: { status: "COMPLETED", amount: { gt: 0 }, createdAt: { lt: window.start }, userId: { in: payerIds } },
        select: { userId: true },
        distinct: ["userId"]
      })
    : [];
  const seen = new Set(earlier.map((row) => row.userId));
  const newPaid = payerIds.filter((id) => !seen.has(id)).length;

  const mix = new Map<string, { planId: string | null; name: string; count: number }>();
  let mrrPaise = 0;
  for (const row of subs) {
    if (row.status === "ACTIVE") mrrPaise += monthly(row.pricePaise, row.duration);
    const key = row.planId || row.plan?.nameEn || "custom";
    const current = mix.get(key) || { planId: row.planId, name: row.plan?.nameEn || "Custom", count: 0 };
    current.count += 1;
    mix.set(key, current);
  }

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
  const board = await agentLeaderboard(month);

  return ok({
    range: window.label,
    start: window.start.toISOString(),
    end: window.end.toISOString(),
    kpis: {
      revenuePaise,
      previousRevenuePaise: prevPaid.reduce((sum, row) => sum + row.amount, 0),
      newPaid,
      mrrPaise,
      arrPaise: mrrPaise * 12,
      activeSubs,
      trials,
      expiring,
      churned,
      signups: signups.length,
      previousSignups: prevSignups,
      scans: scanTotal,
      shopOrders: shopRows.length
    },
    series: {
      days,
      revenue: fill(days, revenueMap),
      previousRevenue: fill(prevDays, previousMap),
      signups: fill(days, signupMap),
      newPaid: fill(days, paidMap),
      shopOrders: fill(days, shopMap),
      scans: fill(days, scanMap)
    },
    planMix: [...mix.values()].sort((a, b) => b.count - a.count),
    leaderboard: { label: board.label, rows: board.rows.slice(0, 8) },
    health: {
      whatsapp,
      lastPaymentAt: lastPayment?.updatedAt.toISOString() || null,
      lastReconcileAt: reconcile?.finishedAt?.toISOString() || beat?.seenAt.toISOString() || null,
      errorRate: jobTotal ? Math.round((failedJobs / jobTotal) * 1000) / 1000 : 0
    }
  });
}

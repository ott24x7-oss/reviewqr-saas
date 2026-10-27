import { cursorQuery, isPageError, readPage } from "@/lib/api/cursor";
import { takePage } from "@/lib/api/page";
import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { financialYearBounds } from "@/lib/plans/tds";
import { adminWindow } from "./range";

/** Collected and refunds follow `range`. Commission balances are current. Paid and TDS are this Indian FY. */
export async function loadAdminMoneySummary(search: URLSearchParams) {
  const window = adminWindow(search);
  if (!window.ok) return fail(400, window.error);
  const fy = financialYearBounds(new Date());
  const [collected, refunds, pending, approved, paidRows] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: "COMPLETED", createdAt: { gte: window.window.start, lt: window.window.end } },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { status: "REFUNDED", updatedAt: { gte: window.window.start, lt: window.window.end } },
      _sum: { amount: true }
    }),
    prisma.shopCommission.aggregate({ where: { status: "PENDING" }, _sum: { amountPaise: true } }),
    prisma.shopCommission.aggregate({ where: { status: "APPROVED" }, _sum: { amountPaise: true } }),
    // Per row: net, then gross, then the legacy amount. A zero is treated as unset.
    prisma.$queryRaw<Array<{ paid: number | bigint; tds: number | bigint }>>`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN "netPaise" <> 0 THEN "netPaise"
            WHEN "grossPaise" <> 0 THEN "grossPaise"
            ELSE "amountPaise"
          END
        ), 0) AS paid,
        COALESCE(SUM("tdsPaise"), 0) AS tds
      FROM "CommissionPayout"
      WHERE "paidAt" >= ${fy.start} AND "paidAt" < ${fy.end}
    `
  ]);
  const paid = paidRows[0];
  return ok({
    range: window.window.label,
    collectedPaise: collected._sum.amount || 0,
    refundsPaise: refunds._sum.amount || 0,
    pendingCommissionsPaise: pending._sum.amountPaise || 0,
    approvedUnpaidPaise: approved._sum.amountPaise || 0,
    paidThisFyPaise: Number(paid?.paid ?? 0),
    tdsThisFyPaise: Number(paid?.tds ?? 0)
  });
}

/** Payout history. Cursor pages, newest id first. No phone or note. */
export async function listAdminPayouts(search: URLSearchParams) {
  const page = readPage(search);
  if (isPageError(page)) return fail(400, page.error);
  const listed = await takePage(
    () =>
      prisma.commissionPayout.findMany({
        orderBy: { id: "desc" },
        ...cursorQuery(page.cursorId, page.limit),
        select: {
          id: true,
          agentId: true,
          amountPaise: true,
          grossPaise: true,
          tdsPaise: true,
          netPaise: true,
          utr: true,
          paidAt: true,
          agent: { select: { name: true } }
        }
      }),
    page.limit
  );
  if (!listed.ok) return listed;
  return ok({
    items: listed.data.items.map((row) => ({
      id: row.id,
      agentId: row.agentId,
      agentName: row.agent.name || "Agent",
      grossPaise: row.grossPaise || row.amountPaise,
      tdsPaise: row.tdsPaise,
      netPaise: row.netPaise || row.grossPaise || row.amountPaise,
      utr: row.utr,
      paidAt: row.paidAt.toISOString()
    })),
    nextCursor: listed.data.nextCursor
  });
}

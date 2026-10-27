import { Prisma } from "@prisma/client";
import type { CommissionBasis, ShopCommissionKind } from "@prisma/client";
import { prisma } from "../db";
import { readyToApprove } from "./commission-rules";

export type LedgerDb = Prisma.TransactionClient | typeof prisma;

export type LedgerInput = {
  agentId: string;
  kind: ShopCommissionKind;
  sourceId: string;
  orderId?: string | null;
  paymentId?: string | null;
  planId?: string | null;
  amountPaise: number;
  percent: number;
  basis?: CommissionBasis;
  flatPaise?: number;
  saleKind?: string;
  holdUntil?: Date | null;
  sharePercent?: number | null;
  leaderId?: string | null;
};

/** One row per agent, kind, and source. A repeat webhook does not insert a second credit. */
export async function recordCommission(input: LedgerInput, db: LedgerDb = prisma) {
  const where = {
    agentId_kind_sourceId: {
      agentId: input.agentId,
      kind: input.kind,
      sourceId: input.sourceId
    }
  };
  const data = {
    agentId: input.agentId,
    kind: input.kind,
    sourceId: input.sourceId,
    orderId: input.orderId || null,
    paymentId: input.paymentId || null,
    planId: input.planId || null,
    amountPaise: Math.max(0, Math.floor(input.amountPaise)),
    percent: Math.max(0, Math.floor(input.percent)),
    basis: input.basis || "PERCENT",
    flatPaise: Math.max(0, Math.floor(input.flatPaise || 0)),
    saleKind: input.saleKind || "RENEWAL",
    status: "PENDING" as const,
    holdUntil: input.holdUntil || null,
    sharePercent: input.sharePercent == null ? null : Math.max(0, Math.floor(input.sharePercent)),
    leaderId: input.leaderId || null
  };
  const existing = await db.shopCommission.findUnique({ where });
  if (existing) return { created: false as const, row: existing };
  // A caught unique violation inside an interactive transaction aborts that transaction.
  if (db !== prisma) {
    const row = await db.shopCommission.create({ data });
    return { created: true as const, row };
  }
  try {
    const row = await prisma.shopCommission.create({ data });
    return { created: true as const, row };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.shopCommission.findUnique({ where });
      if (row) return { created: false as const, row };
    }
    throw error;
  }
}

const REVERSIBLE = ["PENDING", "APPROVED", "PAID"] as const;

/**
 * A commission that was already paid out (payoutId set) becomes money the agent owes back.
 * Pending and approved rows were never paid, so reversing them creates no clawback.
 */
async function reverseMatching(where: Prisma.ShopCommissionWhereInput, reason: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    const paid = await tx.shopCommission.findMany({
      where: { ...where, status: "PAID", payoutId: { not: null } },
      select: { id: true, agentId: true, amountPaise: true }
    });
    if (paid.length) {
      await tx.clawbackDue.createMany({
        data: paid.map((row) => ({
          agentId: row.agentId,
          commissionId: row.id,
          amountPaise: row.amountPaise,
          reason
        })),
        skipDuplicates: true
      });
    }
    const result = await tx.shopCommission.updateMany({
      where: { ...where, status: { in: [...REVERSIBLE] } },
      data: { status: "REVERSED", reversedAt: now }
    });
    return result.count;
  });
}

export async function reverseCommissionsForOrder(orderId: string, now = new Date()) {
  return reverseMatching({ orderId }, `Reversed paid commission on order ${orderId}`, now);
}

export async function reverseCommissionsForPayment(paymentId: string, now = new Date()) {
  return reverseMatching({ paymentId }, `Reversed paid commission on payment ${paymentId}`, now);
}

/** Unsettled clawback still to come off a later payout. */
export async function outstandingClawbackByAgent(agentIds: string[]) {
  const totals = new Map<string, number>();
  if (!agentIds.length) return totals;
  const rows = await prisma.clawbackDue.groupBy({
    by: ["agentId"],
    where: { agentId: { in: agentIds }, settledAt: null },
    _sum: { amountPaise: true }
  });
  for (const row of rows) totals.set(row.agentId, row._sum.amountPaise || 0);
  return totals;
}

export async function approveDueCommissions(now = new Date(), agentId?: string) {
  const pending = await prisma.shopCommission.findMany({
    where: { status: "PENDING", ...(agentId ? { agentId } : {}) },
    select: { id: true, holdUntil: true, status: true }
  });
  const ids = pending.filter((row) => readyToApprove(row.status, row.holdUntil, now)).map((row) => row.id);
  if (!ids.length) return 0;
  const result = await prisma.shopCommission.updateMany({
    where: { id: { in: ids }, status: "PENDING" },
    data: { status: "APPROVED", approvedAt: now }
  });
  return result.count;
}

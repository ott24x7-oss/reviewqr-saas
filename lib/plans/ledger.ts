import { Prisma } from "@prisma/client";
import type { CommissionBasis, ShopCommissionKind } from "@prisma/client";
import { prisma } from "../db";
import { readyToApprove } from "./commission-rules";

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
};

/** One row per agent, kind, and source. A repeat webhook does not insert a second credit. */
export async function recordCommission(input: LedgerInput) {
  const where = {
    agentId_kind_sourceId: {
      agentId: input.agentId,
      kind: input.kind,
      sourceId: input.sourceId
    }
  };
  const existing = await prisma.shopCommission.findUnique({ where });
  if (existing) return { created: false as const, row: existing };
  try {
    const row = await prisma.shopCommission.create({
      data: {
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
        status: "PENDING",
        holdUntil: input.holdUntil || null
      }
    });
    return { created: true as const, row };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const row = await prisma.shopCommission.findUnique({ where });
      if (row) return { created: false as const, row };
    }
    throw error;
  }
}

export async function reverseCommissionsForOrder(orderId: string, now = new Date()) {
  const result = await prisma.shopCommission.updateMany({
    where: { orderId, status: { in: ["PENDING", "APPROVED", "PAID"] } },
    data: { status: "REVERSED", reversedAt: now }
  });
  return result.count;
}

export async function reverseCommissionsForPayment(paymentId: string, now = new Date()) {
  const result = await prisma.shopCommission.updateMany({
    where: { paymentId, status: { in: ["PENDING", "APPROVED", "PAID"] } },
    data: { status: "REVERSED", reversedAt: now }
  });
  return result.count;
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

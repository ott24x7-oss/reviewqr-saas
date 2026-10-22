import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { notifyUser } from "./notify";
import { formatINR } from "../utils";

export async function payApprovedCommissions(input: {
  agentId: string;
  utr: string;
  paidAt: Date;
  note?: string;
  idempotencyKey?: string | null;
}) {
  const utr = input.utr.trim().slice(0, 120);
  if (utr.length < 6) return { ok: false as const, error: "Enter the payout UTR" };
  const idempotencyKey = (input.idempotencyKey || "").trim().slice(0, 120) || null;

  const replay = async () => findPayout(input.agentId, utr, idempotencyKey);
  const seen = await replay();
  if (seen) {
    return { ok: true as const, already: true, payoutId: seen.id, amountPaise: seen.amountPaise, count: 0 };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const again = await findPayout(input.agentId, utr, idempotencyKey, tx);
      if (again) return { kind: "again" as const, payout: again };
      const rows = await tx.shopCommission.findMany({
        where: { agentId: input.agentId, status: "APPROVED" },
        select: { id: true, amountPaise: true }
      });
      const amountPaise = rows.reduce((sum, row) => sum + row.amountPaise, 0);
      if (!rows.length || amountPaise <= 0) return { kind: "empty" as const };
      const payout = await tx.commissionPayout.create({
        data: {
          agentId: input.agentId,
          amountPaise,
          utr,
          paidAt: input.paidAt,
          note: (input.note || "").slice(0, 240),
          idempotencyKey
        }
      });
      await tx.shopCommission.updateMany({
        where: { id: { in: rows.map((row) => row.id) }, status: "APPROVED" },
        data: { status: "PAID", paidAt: input.paidAt, payoutId: payout.id }
      });
      return { kind: "created" as const, payout, count: rows.length };
    });
    if (created.kind === "empty") return { ok: false as const, error: "Nothing approved to pay" };
    if (created.kind === "again") {
      return {
        ok: true as const,
        already: true,
        payoutId: created.payout.id,
        amountPaise: created.payout.amountPaise,
        count: 0
      };
    }
    await notifyUser(
      input.agentId,
      "Payout sent",
      `${formatINR(created.payout.amountPaise)} was paid. UTR ${utr}.`
    );
    return {
      ok: true as const,
      already: false,
      payoutId: created.payout.id,
      amountPaise: created.payout.amountPaise,
      count: created.count
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await replay();
      if (raced) {
        return { ok: true as const, already: true, payoutId: raced.id, amountPaise: raced.amountPaise, count: 0 };
      }
    }
    throw error;
  }
}

async function findPayout(
  agentId: string,
  utr: string,
  idempotencyKey: string | null,
  tx: Prisma.TransactionClient | typeof prisma = prisma
) {
  if (idempotencyKey) {
    const byKey = await tx.commissionPayout.findUnique({ where: { idempotencyKey } });
    if (byKey) return byKey;
  }
  return tx.commissionPayout.findUnique({ where: { agentId_utr: { agentId, utr } } });
}

export async function commissionReportRows() {
  const agents = await prisma.agentProfile.findMany({
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  const rows = [];
  for (const agent of agents) {
    const [commissions, sales] = await Promise.all([
      prisma.shopCommission.groupBy({
        by: ["status"],
        where: { agentId: agent.userId },
        _sum: { amountPaise: true }
      }),
      prisma.payment.aggregate({
        where: {
          status: "COMPLETED",
          user: { businesses: { some: { agentId: agent.userId, archived: false } } }
        },
        _sum: { amount: true },
        _count: { _all: true }
      })
    ]);
    const bucket = (status: string) => commissions.find((row) => row.status === status)?._sum.amountPaise || 0;
    rows.push({
      agentId: agent.userId,
      name: agent.user.name || "Agent",
      phone: agent.user.phone || "",
      email: agent.user.email,
      code: agent.code,
      salesPaise: sales._sum.amount || 0,
      salesCount: sales._count._all,
      pendingPaise: bucket("PENDING"),
      approvedPaise: bucket("APPROVED"),
      paidPaise: bucket("PAID")
    });
  }
  return rows;
}

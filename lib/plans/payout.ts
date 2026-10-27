import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { decryptSecret } from "../crypto";
import { notifyUser } from "./notify";
import { formatINR } from "../utils";
import { getTeamProgramSettings } from "./team-settings";
import { outstandingClawbackByAgent } from "./ledger";
import { financialYearBounds, tdsForPayout } from "./tds";

/**
 * A payout date may not be in the future and may not fall before the current financial
 * year. TDS always uses the financial year of the server's clock, so a backdated paidAt
 * cannot move a payout into an earlier year's threshold.
 */
export function checkPayoutDate(paidAt: Date, now = new Date()) {
  if (Number.isNaN(paidAt.getTime())) return "Invalid date";
  if (paidAt.getTime() > now.getTime()) return "The payout date cannot be in the future";
  if (paidAt.getTime() < financialYearBounds(now).start.getTime()) {
    return "The payout date must be in the current financial year";
  }
  return null;
}

export async function payApprovedCommissions(input: {
  agentId: string;
  utr: string;
  paidAt: Date;
  note?: string;
  idempotencyKey?: string | null;
  /** Server clock. Only tests pass this. */
  now?: Date;
}) {
  const utr = input.utr.trim().slice(0, 120);
  if (utr.length < 6) return { ok: false as const, error: "Enter the payout UTR" };
  const idempotencyKey = (input.idempotencyKey || "").trim().slice(0, 120) || null;
  const now = input.now ?? new Date();

  const replay = async () => findPayout(input.agentId, utr, idempotencyKey);
  const seen = await replay();
  if (seen) return paidResult(seen, true, 0);
  const badDate = checkPayoutDate(input.paidAt, now);
  if (badDate) return { ok: false as const, error: badDate };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const again = await findPayout(input.agentId, utr, idempotencyKey, tx);
      if (again) return { kind: "again" as const, payout: again };
      const rows = await tx.$queryRaw<Array<{ id: string; amountPaise: number }>>`
        SELECT "id", "amountPaise"
        FROM "ShopCommission"
        WHERE "agentId" = ${input.agentId}
          AND "status" = 'APPROVED'::"CommissionStatus"
        ORDER BY "id"
        FOR UPDATE
      `;
      const amountPaise = rows.reduce((sum, row) => sum + Number(row.amountPaise), 0);
      if (!rows.length || amountPaise <= 0) return { kind: "empty" as const };
      const profile = await tx.agentProfile.findUnique({
        where: { userId: input.agentId },
        select: { pan: true, upiId: true, bankAccount: true }
      });
      const pan = profile?.pan ? decryptSecret(profile.pan).replace(/\s/g, "") : "";
      const bank = profile?.bankAccount ? decryptSecret(profile.bankAccount).replace(/\s/g, "") : "";
      if (!pan || (!(profile?.upiId || "").trim() && !bank)) return { kind: "kyc" as const };
      const settings = await getTeamProgramSettings();
      const year = financialYearBounds(now);
      const alreadyGrossPaise = await grossPaiseForPan(tx, canonicalPan(profile?.pan), input.agentId, year);
      const tax = tdsForPayout({
        grossPaise: amountPaise,
        alreadyGrossPaise,
        tdsPercent: settings.tdsPercent,
        thresholdPaise: settings.tdsYearlyThresholdPaise
      });
      const payout = await tx.commissionPayout.create({
        data: {
          agentId: input.agentId,
          amountPaise: tax.netPaise,
          grossPaise: tax.grossPaise,
          tdsPaise: tax.tdsPaise,
          netPaise: tax.netPaise,
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
    if (created.kind === "kyc") {
      return { ok: false as const, error: "Add a PAN and a UPI ID or bank account before a payout" };
    }
    if (created.kind === "again") return paidResult(created.payout, true, 0);
    await notifyUser(
      input.agentId,
      "Payout sent",
      `${formatINR(created.payout.netPaise)} was paid after TDS. UTR ${utr}.`
    );
    return paidResult(created.payout, false, created.count);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await replay();
      if (raced) return paidResult(raced, true, 0);
    }
    throw error;
  }
}

function paidResult(
  payout: { id: string; amountPaise: number; grossPaise: number; tdsPaise: number; netPaise: number },
  already: boolean,
  count: number
) {
  const netPaise = payout.netPaise || payout.amountPaise;
  return {
    ok: true as const,
    already,
    payoutId: payout.id,
    amountPaise: netPaise,
    grossPaise: payout.grossPaise || payout.amountPaise,
    tdsPaise: payout.tdsPaise,
    netPaise,
    count
  };
}

const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Decrypted PAN, or empty when the stored value is missing or not a PAN. */
export function canonicalPan(stored: string | null | undefined) {
  if (!stored) return "";
  const value = decryptSecret(stored).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return PAN_SHAPE.test(value) ? value : "";
}

/**
 * TDS threshold is per person, not per agent login. Every profile whose decrypted
 * PAN matches is summed for this financial year. A PAN we cannot read falls back
 * to this agent only, so blank decrypts are not treated as one person.
 */
async function grossPaiseForPan(
  tx: Prisma.TransactionClient,
  pan: string,
  agentId: string,
  year: { start: Date; end: Date }
) {
  const paidAt = { gte: year.start, lt: year.end };
  let agentIds = [agentId];
  if (pan) {
    const profiles = await tx.agentProfile.findMany({
      where: { pan: { not: null } },
      select: { userId: true, pan: true }
    });
    const matched = profiles.filter((row) => canonicalPan(row.pan) === pan).map((row) => row.userId);
    if (matched.length) agentIds = matched;
  }
  const prior = await tx.commissionPayout.aggregate({
    where: { agentId: { in: agentIds }, paidAt },
    _sum: { grossPaise: true }
  });
  return prior._sum.grossPaise || 0;
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

export async function decideLegacyCommission(id: string, action: "approve" | "paid") {
  const row = await prisma.shopCommission.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!row || row.status !== "LEGACY_UNSETTLED") {
    return { ok: false as const, error: "That commission is not in the unsettled history" };
  }
  const now = new Date();
  if (action === "approve") {
    await prisma.shopCommission.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: now }
    });
  } else {
    await prisma.shopCommission.update({
      where: { id },
      data: { status: "PAID", paidAt: now }
    });
  }
  return { ok: true as const };
}

export async function legacyCommissionRows() {
  return prisma.shopCommission.findMany({
    where: { status: "LEGACY_UNSETTLED" },
    orderBy: { createdAt: "asc" },
    include: { agent: { select: { name: true, phone: true, email: true } } }
  });
}

export async function commissionReportRows() {
  const agents = await prisma.agentProfile.findMany({
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });
  const clawback = await outstandingClawbackByAgent(agents.map((agent) => agent.userId));
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
      paidPaise: bucket("PAID"),
      legacyPaise: bucket("LEGACY_UNSETTLED"),
      clawbackPaise: clawback.get(agent.userId) || 0
    });
  }
  return rows;
}

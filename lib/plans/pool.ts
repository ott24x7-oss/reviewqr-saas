import type { CommissionBasis, Prisma, ShopCommissionKind } from "@prisma/client";
import { prisma } from "../db";
import { recordCommission } from "./ledger";
import { getTeamProgramSettings } from "./team-settings";
import { splitCommissionPool, type ChainMember, type EarnerStatus } from "./team-split";

export type CommissionDb = Prisma.TransactionClient | typeof prisma;

function earnsStatus(status: "PENDING" | "ACTIVE" | "PAUSED", active: boolean): EarnerStatus {
  if (status === "PENDING") return "PENDING";
  if (status === "PAUSED" || !active) return "PAUSED";
  return "ACTIVE";
}

/** Seller first, then each leader, stopped at maxTeamDepth. A cycle is ignored. */
export async function loadSellerChain(sellerId: string, db: CommissionDb = prisma): Promise<ChainMember[]> {
  const settings = await getTeamProgramSettings();
  const chain: ChainMember[] = [];
  let userId: string | null = sellerId;
  const seen = new Set<string>();
  while (userId && chain.length < settings.maxTeamDepth && !seen.has(userId)) {
    seen.add(userId);
    const profile: {
      userId: string;
      status: "PENDING" | "ACTIVE" | "PAUSED";
      active: boolean;
      sharePercent: number | null;
      depth: number;
      leader: { userId: string } | null;
    } | null = await db.agentProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        status: true,
        active: true,
        sharePercent: true,
        depth: true,
        leader: { select: { userId: true } }
      }
    });
    if (!profile) {
      if (chain.length === 0) chain.push({ userId, status: "ACTIVE", sharePercent: null, depth: 1 });
      break;
    }
    chain.push({
      userId: profile.userId,
      status: earnsStatus(profile.status, profile.active),
      sharePercent: profile.sharePercent,
      depth: profile.depth
    });
    userId = profile.leader?.userId ?? null;
  }
  return chain;
}

/**
 * Write the seller row and one TEAM_OVERRIDE per leader. Recruiting never calls this.
 * The same source can be credited again; the (agent, kind, source) unique key keeps one row each.
 */
export async function creditPooledCommission(
  input: {
    sellerId: string;
    sellerKind: Extract<ShopCommissionKind, "SALE" | "RENEWAL" | "HARDWARE">;
    poolPaise: number;
    sourceId: string;
    orderId?: string | null;
    paymentId?: string | null;
    planId?: string | null;
    percent: number;
    basis?: CommissionBasis;
    flatPaise?: number;
    saleKind?: string;
    holdUntil?: Date | null;
  },
  db: CommissionDb = prisma
) {
  const poolPaise = Math.max(0, Math.floor(input.poolPaise));
  if (poolPaise <= 0) return [];
  const settings = await getTeamProgramSettings();
  const chain = await loadSellerChain(input.sellerId, db);
  const lines = splitCommissionPool({
    poolPaise,
    chain,
    minSharePercent: settings.minSharePercent,
    maxSharePercent: settings.maxSharePercent
  });
  const rows = [];
  for (const line of lines) {
    const result = await recordCommission(
      {
        agentId: line.agentId,
        kind: line.role === "override" ? "TEAM_OVERRIDE" : input.sellerKind,
        sourceId: input.sourceId,
        orderId: input.orderId,
        paymentId: input.paymentId,
        planId: input.planId,
        amountPaise: line.amountPaise,
        percent: input.percent,
        basis: input.basis,
        flatPaise: input.flatPaise,
        saleKind: input.saleKind,
        holdUntil: input.holdUntil,
        sharePercent: line.sharePercent,
        leaderId: line.leaderId
      },
      db
    );
    rows.push(result.row);
  }
  return rows;
}

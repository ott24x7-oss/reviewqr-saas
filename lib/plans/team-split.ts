export type EarnerStatus = "PENDING" | "ACTIVE" | "PAUSED";

export type ChainMember = {
  userId: string;
  status: EarnerStatus;
  /** Null uses the minimum allowed share until a leader sets one. */
  sharePercent: number | null;
  depth: number;
};

export type SplitLine = {
  agentId: string;
  role: "seller" | "override";
  amountPaise: number;
  sharePercent: number;
  leaderId: string | null;
};

/** A missing share pays the floor of the cap. A stored share outside the cap is clamped. */
export function clampShare(share: number | null | undefined, minSharePercent: number, maxSharePercent: number) {
  const floor = Math.min(minSharePercent, maxSharePercent);
  const cap = Math.max(minSharePercent, maxSharePercent);
  if (share == null || !Number.isFinite(share)) return floor;
  return Math.min(cap, Math.max(floor, Math.floor(share)));
}

/**
 * Split one commission pool down the leader chain.
 * chain[0] is the person who made the sale. Each later entry is their leader.
 * An active earner who still has a leader keeps floor(pool * share / 100) paise.
 * The leader gets the remainder, and that remainder is the next pool. It is never
 * larger than the original commission. Rounding stays with the leader.
 * A pending or paused earner keeps nothing. Their share stays in the pool for the
 * next active ancestor. If nobody left is active, that remainder is not paid.
 */
export function splitCommissionPool(input: {
  poolPaise: number;
  chain: ChainMember[];
  minSharePercent: number;
  maxSharePercent: number;
}): SplitLine[] {
  const pool = Math.max(0, Math.floor(input.poolPaise));
  if (pool <= 0 || input.chain.length === 0) return [];
  const lines: SplitLine[] = [];
  let remaining = pool;
  const seen = new Set<string>();
  for (let i = 0; i < input.chain.length && remaining > 0; i += 1) {
    const person = input.chain[i];
    if (seen.has(person.userId)) break;
    seen.add(person.userId);
    const next = input.chain[i + 1];
    const earns = person.status === "ACTIVE";
    if (!next || seen.has(next.userId)) {
      if (earns) {
        lines.push({
          agentId: person.userId,
          role: i === 0 ? "seller" : "override",
          amountPaise: remaining,
          sharePercent: 100,
          leaderId: null
        });
      }
      break;
    }
    const share = clampShare(person.sharePercent, input.minSharePercent, input.maxSharePercent);
    const keep = earns ? Math.floor((remaining * share) / 100) : 0;
    if (keep > 0) {
      lines.push({
        agentId: person.userId,
        role: i === 0 ? "seller" : "override",
        amountPaise: keep,
        sharePercent: share,
        leaderId: next.userId
      });
    }
    remaining -= keep;
  }
  return lines;
}

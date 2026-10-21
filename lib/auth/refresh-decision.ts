export type RefreshRow = {
  id: string;
  userId: string;
  familyId: string;
  usedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

export type RefreshDecision =
  | { action: "reject" }
  | { action: "revoke-family"; familyId: string; userId: string }
  | { action: "rotate"; sessionId: string; familyId: string; userId: string };

export function decideRefresh(row: RefreshRow | null, now = new Date()): RefreshDecision {
  if (!row || row.revokedAt || row.expiresAt.getTime() <= now.getTime()) return { action: "reject" };
  if (row.usedAt) return { action: "revoke-family", familyId: row.familyId, userId: row.userId };
  return { action: "rotate", sessionId: row.id, familyId: row.familyId, userId: row.userId };
}

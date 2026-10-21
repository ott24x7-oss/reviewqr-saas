import { describe, expect, it } from "vitest";
import { decideRefresh, type RefreshRow } from "../../lib/auth/refresh-decision";

const now = new Date("2026-10-22T12:00:00.000Z");

function row(patch: Partial<RefreshRow> = {}): RefreshRow {
  return {
    id: "sess-1",
    userId: "user-1",
    familyId: "fam-1",
    usedAt: null,
    revokedAt: null,
    expiresAt: new Date("2026-11-21T12:00:00.000Z"),
    ...patch
  };
}

describe("refresh decisions", () => {
  it("rotates a live unused token", () => {
    expect(decideRefresh(row(), now)).toEqual({
      action: "rotate",
      sessionId: "sess-1",
      familyId: "fam-1",
      userId: "user-1"
    });
  });

  it("rejects a missing, revoked, or expired token", () => {
    expect(decideRefresh(null, now).action).toBe("reject");
    expect(decideRefresh(row({ revokedAt: now }), now).action).toBe("reject");
    expect(decideRefresh(row({ expiresAt: now }), now).action).toBe("reject");
  });

  it("revokes the family when a used token is presented again", () => {
    expect(decideRefresh(row({ usedAt: new Date("2026-10-22T11:00:00.000Z") }), now)).toEqual({
      action: "revoke-family",
      familyId: "fam-1",
      userId: "user-1"
    });
  });
});

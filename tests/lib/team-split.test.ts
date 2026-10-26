import { describe, expect, it } from "vitest";
import { splitCommissionPool, type ChainMember } from "../../lib/plans/team-split";

const caps = { minSharePercent: 50, maxSharePercent: 90 };

function member(userId: string, sharePercent: number | null, status: ChainMember["status"] = "ACTIVE"): ChainMember {
  return { userId, status, sharePercent, depth: 1 };
}

function paid(lines: ReturnType<typeof splitCommissionPool>) {
  return lines.reduce((sum, line) => sum + line.amountPaise, 0);
}

describe("team commission split", () => {
  it("splits a 2-level pool and gives the leader the remainder", () => {
    const lines = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("member", 70), member("leader", null)],
      ...caps
    });
    expect(lines).toEqual([
      { agentId: "member", role: "seller", amountPaise: 14000, sharePercent: 70, leaderId: "leader" },
      { agentId: "leader", role: "override", amountPaise: 6000, sharePercent: 100, leaderId: null }
    ]);
    expect(paid(lines)).toBe(20000);
  });

  it("splits a 3-level pool from each level's own share of the remainder", () => {
    const lines = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("seller", 70), member("mid", 60), member("top", null)],
      ...caps
    });
    expect(lines.map((line) => [line.agentId, line.amountPaise, line.role])).toEqual([
      ["seller", 14000, "seller"],
      ["mid", 3600, "override"],
      ["top", 2400, "override"]
    ]);
    expect(paid(lines)).toBe(20000);
  });

  it("clamps a share into the admin caps and uses the minimum when the share is unset", () => {
    const high = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("member", 99), member("leader", null)],
      ...caps
    });
    const low = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("member", 10), member("leader", null)],
      ...caps
    });
    const unset = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("member", null), member("leader", null)],
      ...caps
    });
    expect(high[0]).toMatchObject({ amountPaise: 18000, sharePercent: 90 });
    expect(low[0]).toMatchObject({ amountPaise: 10000, sharePercent: 50 });
    expect(unset[0]).toMatchObject({ amountPaise: 10000, sharePercent: 50 });
    expect(paid(high)).toBe(20000);
    expect(paid(low)).toBe(20000);
    expect(paid(unset)).toBe(20000);
  });

  it("rounds to whole paise and leaves the remainder with the leader", () => {
    const lines = splitCommissionPool({
      poolPaise: 201,
      chain: [member("member", 70), member("leader", null)],
      ...caps
    });
    expect(lines.map((line) => line.amountPaise)).toEqual([140, 61]);
    expect(paid(lines)).toBe(201);
  });

  it("gives a paused or unapproved member's share to the leader", () => {
    for (const status of ["PAUSED", "PENDING"] as const) {
      const lines = splitCommissionPool({
        poolPaise: 20000,
        chain: [member("member", 70, status), member("leader", 60), member("top", null)],
        ...caps
      });
      expect(lines.find((line) => line.agentId === "member")).toBeUndefined();
      expect(paid(lines)).toBe(20000);
      expect(lines[0]?.agentId).toBe("leader");
    }
  });

  it("pays a direct sale in full and does not pay a zero pool", () => {
    const direct = splitCommissionPool({
      poolPaise: 5000,
      chain: [member("leader", 70)],
      ...caps
    });
    expect(direct).toEqual([
      { agentId: "leader", role: "seller", amountPaise: 5000, sharePercent: 100, leaderId: null }
    ]);
    expect(
      splitCommissionPool({ poolPaise: 0, chain: [member("member", 70), member("leader", null)], ...caps })
    ).toEqual([]);
  });

  it("keeps an unpaid remainder when every ancestor is paused", () => {
    const lines = splitCommissionPool({
      poolPaise: 20000,
      chain: [member("member", 70, "PAUSED"), member("leader", null, "PAUSED")],
      ...caps
    });
    expect(lines).toEqual([]);
  });
});

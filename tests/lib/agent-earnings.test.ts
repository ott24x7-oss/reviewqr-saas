import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { loadAgentEarningsTotals, loadContractHome } from "../../lib/plans/agent-team";
import { makeCode } from "../../lib/plans/codes";

describe("agent earnings totals", () => {
  let agentId = "";

  afterAll(async () => {
    if (!agentId) return;
    await prisma.shopCommission.deleteMany({ where: { agentId } });
    await prisma.agentProfile.deleteMany({ where: { userId: agentId } });
    await prisma.user.deleteMany({ where: { id: agentId } });
  });

  it("sums every row in the database and leaves reversed commissions out", async () => {
    const agent = await prisma.user.create({ data: { email: `earn-${Date.now()}-${makeCode(4)}@example.test`, role: "AGENT" } });
    agentId = agent.id;
    await prisma.agentProfile.create({ data: { userId: agent.id, code: makeCode(10) } });
    // More rows than the earnings page lists, so a page-based total would be short.
    await prisma.shopCommission.createMany({
      data: Array.from({ length: 105 }, (_, i) => ({
        agentId: agent.id,
        kind: "SALE" as const,
        sourceId: `earn-sale-${agent.id}-${i}`,
        amountPaise: 100,
        percent: 10,
        status: i % 2 ? ("PAID" as const) : ("PENDING" as const)
      }))
    });
    await prisma.shopCommission.createMany({
      data: [
        { agentId: agent.id, kind: "TEAM_OVERRIDE", sourceId: `earn-team-${agent.id}`, amountPaise: 700, percent: 10, status: "APPROVED" },
        { agentId: agent.id, kind: "SALE", sourceId: `earn-rev-${agent.id}`, amountPaise: 50_000, percent: 10, status: "REVERSED" },
        { agentId: agent.id, kind: "TEAM_OVERRIDE", sourceId: `earn-rev2-${agent.id}`, amountPaise: 9_000, percent: 10, status: "REVERSED" }
      ]
    });

    expect(await loadAgentEarningsTotals(agent.id)).toEqual({ ownPaise: 10_500, teamPaise: 700 });
    const home = await loadContractHome(agent.id);
    expect(home.ok).toBe(true);
    if (!home.ok) return;
    expect(home.data.earnings).toEqual({ todayPaise: 11_200, monthPaise: 11_200, pendingPaise: 5_300, paidPaise: 5_200 });
  });
});

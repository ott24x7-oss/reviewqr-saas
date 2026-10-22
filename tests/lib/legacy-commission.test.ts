import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { decideLegacyCommission, payApprovedCommissions } from "../../lib/plans/payout";

describe("historical commissions", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("keeps unsettled history out of payout until an admin approves or marks it paid", async () => {
    const agent = await prisma.user.create({
      data: { email: `legacy-agent-${Date.now()}@example.test`, role: "AGENT" }
    });
    users.push(agent.id);
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const historical = await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "ORDER",
        sourceId: `legacy-${agent.id}`,
        amountPaise: 800,
        percent: 10,
        status: "LEGACY_UNSETTLED",
        createdAt
      }
    });
    const blocked = await payApprovedCommissions({
      agentId: agent.id,
      utr: "LEGACY123",
      paidAt: new Date(),
      idempotencyKey: `legacy-pay-${agent.id}`
    });
    expect(blocked.ok).toBe(false);

    const approved = await decideLegacyCommission(historical.id, "approve");
    expect(approved.ok).toBe(true);
    expect((await prisma.shopCommission.findUnique({ where: { id: historical.id } }))?.status).toBe("APPROVED");

    const other = await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "ORDER",
        sourceId: `legacy-paid-${agent.id}`,
        amountPaise: 400,
        percent: 10,
        status: "LEGACY_UNSETTLED"
      }
    });
    const marked = await decideLegacyCommission(other.id, "paid");
    expect(marked.ok).toBe(true);
    expect((await prisma.shopCommission.findUnique({ where: { id: other.id } }))?.status).toBe("PAID");
    expect(await decideLegacyCommission(other.id, "approve")).toEqual({
      ok: false,
      error: "That commission is not in the unsettled history"
    });
  });
});

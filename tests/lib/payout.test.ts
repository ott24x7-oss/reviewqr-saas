import { afterAll, describe, expect, it, vi } from "vitest";

const notifyUser = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/plans/notify", () => ({ notifyUser }));

import { prisma } from "../../lib/db";
import { payApprovedCommissions } from "../../lib/plans/payout";

describe("commission payout", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("records one payout per agent and UTR and notifies once", async () => {
    notifyUser.mockClear();
    const agent = await prisma.user.create({
      data: { email: `payout-${Date.now()}@example.test`, role: "AGENT" }
    });
    users.push(agent.id);
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "RENEWAL",
        sourceId: `pay-src-${agent.id}`,
        amountPaise: 1500,
        percent: 0,
        basis: "FLAT",
        flatPaise: 1500,
        status: "APPROVED"
      }
    });
    const input = {
      agentId: agent.id,
      utr: "UTR123456",
      paidAt: new Date("2026-10-01T00:00:00.000Z"),
      note: "October",
      idempotencyKey: `form-${agent.id}`
    };
    const first = await payApprovedCommissions(input);
    const second = await payApprovedCommissions(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.already).toBe(true);
    expect(second.payoutId).toBe(first.payoutId);
    expect(await prisma.commissionPayout.count({ where: { agentId: agent.id, utr: "UTR123456" } })).toBe(1);
    const row = await prisma.shopCommission.findFirst({ where: { agentId: agent.id } });
    expect(row?.status).toBe("PAID");
    expect(notifyUser).toHaveBeenCalledTimes(1);
  });

  it("lets only one of two concurrent payouts include the same commission", async () => {
    const agent = await prisma.user.create({
      data: { email: `payout-race-${Date.now()}@example.test`, role: "AGENT" }
    });
    users.push(agent.id);
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "RENEWAL",
        sourceId: `race-src-${agent.id}`,
        amountPaise: 2500,
        percent: 0,
        basis: "FLAT",
        flatPaise: 2500,
        status: "APPROVED"
      }
    });
    const paidAt = new Date("2026-10-22T00:00:00.000Z");
    const [first, second] = await Promise.all([
      payApprovedCommissions({
        agentId: agent.id,
        utr: "CONCURR0001",
        paidAt,
        idempotencyKey: `race-a-${agent.id}`
      }),
      payApprovedCommissions({
        agentId: agent.id,
        utr: "CONCURR0002",
        paidAt,
        idempotencyKey: `race-b-${agent.id}`
      })
    ]);
    const paid = [first, second].filter((row) => row.ok && row.already === false);
    expect(paid).toHaveLength(1);
    if (paid[0]?.ok) expect(paid[0].amountPaise).toBe(2500);
    const payouts = await prisma.commissionPayout.findMany({ where: { agentId: agent.id } });
    expect(payouts).toHaveLength(1);
    expect(payouts[0]?.amountPaise).toBe(2500);
    const row = await prisma.shopCommission.findFirst({ where: { agentId: agent.id } });
    expect(row?.status).toBe("PAID");
    expect(row?.payoutId).toBe(payouts[0]?.id);
  });
});

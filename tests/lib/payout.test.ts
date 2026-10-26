import { afterAll, describe, expect, it, vi } from "vitest";

const notifyUser = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/plans/notify", () => ({ notifyUser }));

import { encryptSecret } from "../../lib/crypto";
import { prisma } from "../../lib/db";
import { payApprovedCommissions } from "../../lib/plans/payout";
import { saveTeamProgramSettings } from "../../lib/plans/team-settings";

async function agentWithKyc(label: string) {
  const stamp = `${label}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const agent = await prisma.user.create({ data: { email: `${stamp}@example.test`, role: "AGENT" } });
  await prisma.agentProfile.create({
    data: {
      userId: agent.id,
      code: stamp.replace(/[^a-z0-9]/gi, "").slice(0, 16).toUpperCase(),
      upiId: "agent@upi",
      pan: encryptSecret("ABCDE1234F")
    }
  });
  return agent;
}

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
    const agent = await agentWithKyc("payout");
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
    const agent = await agentWithKyc("payout-race");
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

  it("blocks a payout until the agent has a PAN and a UPI ID or bank account", async () => {
    const agent = await prisma.user.create({
      data: { email: `payout-kyc-${Date.now()}@example.test`, role: "AGENT" }
    });
    users.push(agent.id);
    await prisma.agentProfile.create({
      data: { userId: agent.id, code: `KYC${Date.now().toString(36)}`.slice(0, 12).toUpperCase(), upiId: "" }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "RENEWAL",
        sourceId: `kyc-${agent.id}`,
        amountPaise: 1000,
        percent: 0,
        status: "APPROVED"
      }
    });
    const blocked = await payApprovedCommissions({
      agentId: agent.id,
      utr: "KYC123456",
      paidAt: new Date("2026-10-01T00:00:00.000Z")
    });
    expect(blocked.ok).toBe(false);
    expect(await prisma.commissionPayout.count({ where: { agentId: agent.id } })).toBe(0);
  });

  it("withholds TDS only on commission above the yearly threshold", async () => {
    const previous = await prisma.appSetting.findUnique({ where: { key: "plans.team" } });
    await saveTeamProgramSettings({
      maxTeamDepth: 2,
      minSharePercent: 50,
      maxSharePercent: 90,
      autoApproveSubAgents: false,
      tdsPercent: 10,
      tdsYearlyThresholdPaise: 10000
    });
    try {
      const agent = await agentWithKyc("tds");
      users.push(agent.id);
      await prisma.shopCommission.create({
        data: { agentId: agent.id, kind: "SALE", sourceId: `tds-a-${agent.id}`, amountPaise: 8000, percent: 0, status: "APPROVED" }
      });
      const first = await payApprovedCommissions({
        agentId: agent.id,
        utr: "TDSUNDER1",
        paidAt: new Date("2026-06-01T00:00:00+05:30")
      });
      expect(first.ok && first.grossPaise).toBe(8000);
      expect(first.ok && first.tdsPaise).toBe(0);
      expect(first.ok && first.netPaise).toBe(8000);

      await prisma.shopCommission.create({
        data: { agentId: agent.id, kind: "SALE", sourceId: `tds-b-${agent.id}`, amountPaise: 5000, percent: 0, status: "APPROVED" }
      });
      const second = await payApprovedCommissions({
        agentId: agent.id,
        utr: "TDSOVER001",
        paidAt: new Date("2026-08-01T00:00:00+05:30")
      });
      expect(second.ok && second.grossPaise).toBe(5000);
      expect(second.ok && second.tdsPaise).toBe(300);
      expect(second.ok && second.netPaise).toBe(4700);
      const stored = await prisma.commissionPayout.findFirst({ where: { agentId: agent.id, utr: "TDSOVER001" } });
      expect(stored).toMatchObject({ grossPaise: 5000, tdsPaise: 300, netPaise: 4700, amountPaise: 4700 });
    } finally {
      if (previous) await prisma.appSetting.update({ where: { key: "plans.team" }, data: { value: previous.value } });
      else await prisma.appSetting.deleteMany({ where: { key: "plans.team" } });
    }
  });
});

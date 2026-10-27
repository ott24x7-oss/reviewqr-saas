import { afterAll, describe, expect, it, vi } from "vitest";

const notifyUser = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/plans/notify", () => ({ notifyUser }));

import { encryptSecret } from "../../lib/crypto";
import { prisma } from "../../lib/db";
import { checkPayoutDate, payApprovedCommissions } from "../../lib/plans/payout";
import { saveTeamProgramSettings } from "../../lib/plans/team-settings";

let panSerial = 2000;
function nextPan() {
  panSerial += 1;
  return `AAAAA${String(panSerial).padStart(4, "0")}A`;
}

async function agentWithKyc(label: string, pan = nextPan()) {
  const stamp = `${label}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
  const agent = await prisma.user.create({ data: { email: `${stamp}@example.test`, role: "AGENT" } });
  await prisma.agentProfile.create({
    data: {
      userId: agent.id,
      code: stamp.replace(/[^a-z0-9]/gi, "").slice(0, 16).toUpperCase(),
      upiId: "agent@upi",
      pan: encryptSecret(pan)
    }
  });
  return agent;
}

/** The server clock for these tests. The financial year is 1 Apr 2026 to 31 Mar 2027. */
const NOW = new Date("2026-10-26T12:00:00+05:30");

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
      now: NOW,
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
        now: NOW,
        idempotencyKey: `race-a-${agent.id}`
      }),
      payApprovedCommissions({
        agentId: agent.id,
        utr: "CONCURR0002",
        paidAt,
        now: NOW,
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
      paidAt: new Date("2026-10-01T00:00:00.000Z"),
      now: NOW
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
        paidAt: new Date("2026-06-01T00:00:00+05:30"),
        now: NOW
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
        paidAt: new Date("2026-08-01T00:00:00+05:30"),
        now: NOW
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
  it("refuses a future or earlier-year payout date and keeps the commission approved", async () => {
    expect(checkPayoutDate(new Date("2026-10-26T11:00:00+05:30"), NOW)).toBeNull();
    expect(checkPayoutDate(new Date("2026-04-01T00:00:00+05:30"), NOW)).toBeNull();
    expect(checkPayoutDate(new Date("2026-10-27T00:00:00+05:30"), NOW)).toMatch(/future/);
    expect(checkPayoutDate(new Date("2026-03-31T23:59:00+05:30"), NOW)).toMatch(/financial year/);
    expect(checkPayoutDate(new Date("nope"), NOW)).toBe("Invalid date");

    const agent = await agentWithKyc("backdate");
    users.push(agent.id);
    await prisma.shopCommission.create({
      data: { agentId: agent.id, kind: "SALE", sourceId: `back-${agent.id}`, amountPaise: 9000, percent: 0, status: "APPROVED" }
    });
    for (const paidAt of [new Date("2026-03-15T10:00:00+05:30"), new Date("2026-11-01T10:00:00+05:30")]) {
      const result = await payApprovedCommissions({ agentId: agent.id, utr: `BACK${paidAt.getTime()}`, paidAt, now: NOW });
      expect(result.ok).toBe(false);
    }
    expect(await prisma.commissionPayout.count({ where: { agentId: agent.id } })).toBe(0);
    expect((await prisma.shopCommission.findFirst({ where: { agentId: agent.id } }))?.status).toBe("APPROVED");
  });

  it("applies the TDS threshold across every agent account that shares a PAN", async () => {
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
      const pan = nextPan();
      const spaced = `${pan.slice(0, 5)} ${pan.slice(5, 9)} ${pan.slice(9)}`.toLowerCase();
      const first = await agentWithKyc("pan-a", pan);
      const second = await agentWithKyc("pan-b", spaced);
      const other = await agentWithKyc("pan-c");
      users.push(first.id, second.id, other.id);

      await prisma.shopCommission.create({
        data: { agentId: first.id, kind: "SALE", sourceId: `pan-a-${first.id}`, amountPaise: 8000, percent: 0, status: "APPROVED" }
      });
      const under = await payApprovedCommissions({
        agentId: first.id,
        utr: "PANUNDER1",
        paidAt: new Date("2026-06-01T00:00:00+05:30"),
        now: NOW
      });
      expect(under.ok && under.tdsPaise).toBe(0);

      await prisma.commissionPayout.create({
        data: {
          agentId: second.id,
          amountPaise: 50000,
          grossPaise: 50000,
          tdsPaise: 0,
          netPaise: 50000,
          utr: "PANOLDYEAR",
          paidAt: new Date("2026-03-15T10:00:00+05:30")
        }
      });
      await prisma.shopCommission.create({
        data: { agentId: second.id, kind: "SALE", sourceId: `pan-b-${second.id}`, amountPaise: 5000, percent: 0, status: "APPROVED" }
      });
      const shared = await payApprovedCommissions({
        agentId: second.id,
        utr: "PANSHARED1",
        paidAt: new Date("2026-08-01T00:00:00+05:30"),
        now: NOW
      });
      expect(shared.ok && shared.grossPaise).toBe(5000);
      expect(shared.ok && shared.tdsPaise).toBe(300);
      expect(shared.ok && shared.netPaise).toBe(4700);

      await prisma.shopCommission.create({
        data: { agentId: other.id, kind: "SALE", sourceId: `pan-c-${other.id}`, amountPaise: 5000, percent: 0, status: "APPROVED" }
      });
      const alone = await payApprovedCommissions({
        agentId: other.id,
        utr: "PANALONE01",
        paidAt: new Date("2026-09-01T00:00:00+05:30"),
        now: NOW
      });
      expect(alone.ok && alone.tdsPaise).toBe(0);
    } finally {
      if (previous) await prisma.appSetting.update({ where: { key: "plans.team" }, data: { value: previous.value } });
      else await prisma.appSetting.deleteMany({ where: { key: "plans.team" } });
    }
  });
});

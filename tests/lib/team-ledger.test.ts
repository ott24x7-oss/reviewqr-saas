import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { reverseCommissionsForPayment } from "../../lib/plans/ledger";
import { creditPooledCommission } from "../../lib/plans/pool";
import { saveTeamProgramSettings } from "../../lib/plans/team-settings";
import { creditRenewalCommission } from "../../lib/shop/renewal-commission";

describe("team ledger", () => {
  const users: string[] = [];
  const payments: string[] = [];
  const rules: string[] = [];
  let previousSetting: string | null = null;

  beforeAll(async () => {
    const row = await prisma.appSetting.findUnique({ where: { key: "plans.team" } });
    previousSetting = row?.value ?? null;
    await saveTeamProgramSettings({
      maxTeamDepth: 2,
      minSharePercent: 50,
      maxSharePercent: 90,
      autoApproveSubAgents: false,
      tdsPercent: 5,
      tdsYearlyThresholdPaise: 1_500_000
    });
  });

  afterAll(async () => {
    if (previousSetting == null) await prisma.appSetting.deleteMany({ where: { key: "plans.team" } });
    else await prisma.appSetting.update({ where: { key: "plans.team" }, data: { value: previousSetting } });
    if (rules.length) await prisma.commissionRule.deleteMany({ where: { id: { in: rules } } });
    if (payments.length) {
      await prisma.shopCommission.deleteMany({ where: { paymentId: { in: payments } } });
      await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    }
    if (users.length) {
      await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
      await prisma.business.deleteMany({ where: { OR: [{ ownerId: { in: users } }, { agentId: { in: users } }] } });
      await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  async function pair(sharePercent: number | null, memberStatus: "ACTIVE" | "PAUSED" | "PENDING" = "ACTIVE") {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const leader = await prisma.user.create({ data: { email: `lead-${stamp}@example.test`, name: "Leader", role: "AGENT" } });
    const seller = await prisma.user.create({ data: { email: `sell-${stamp}@example.test`, name: "Seller", role: "AGENT" } });
    users.push(leader.id, seller.id);
    const leaderProfile = await prisma.agentProfile.create({
      data: { userId: leader.id, code: `L${stamp}`.slice(0, 12).toUpperCase(), status: "ACTIVE", depth: 1, active: true }
    });
    await prisma.agentProfile.create({
      data: {
        userId: seller.id,
        code: `M${stamp}`.slice(0, 12).toUpperCase(),
        status: memberStatus,
        active: memberStatus === "ACTIVE",
        depth: 2,
        sharePercent,
        leaderId: leaderProfile.id
      }
    });
    return { leader, seller, stamp };
  }

  function sum(rows: Array<{ amountPaise: number }>) {
    return rows.reduce((total, row) => total + row.amountPaise, 0);
  }

  it("credits a first plan sale as SALE plus a team override that add up to the pool", async () => {
    const { leader, seller, stamp } = await pair(70);
    const owner = await prisma.user.create({ data: { email: `own-${stamp}@example.test`, role: "USER" } });
    users.push(owner.id);
    await prisma.business.create({
      data: { ownerId: owner.id, name: `Cafe ${stamp}`, slug: `cafe-${stamp}`, agentId: seller.id }
    });
    const rule = await prisma.commissionRule.create({
      data: { agentId: seller.id, hardware: false, firstBasis: "FLAT", firstFlatPaise: 20000, renewalBasis: "FLAT", renewalFlatPaise: 8000 }
    });
    rules.push(rule.id);
    const payment = await prisma.payment.create({
      data: { userId: owner.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    payments.push(payment.id);
    await creditRenewalCommission(owner.id, payment.id, payment.amount);
    await creditRenewalCommission(owner.id, payment.id, payment.amount);
    const rows = await prisma.shopCommission.findMany({ where: { paymentId: payment.id } });
    expect(rows).toHaveLength(2);
    const sale = rows.find((row) => row.agentId === seller.id);
    const override = rows.find((row) => row.agentId === leader.id);
    expect(sale).toMatchObject({ kind: "SALE", amountPaise: 14000, sharePercent: 70, leaderId: leader.id, status: "PENDING" });
    expect(override).toMatchObject({ kind: "TEAM_OVERRIDE", amountPaise: 6000, leaderId: null });
    expect(sale?.holdUntil?.getTime()).toBe(override?.holdUntil?.getTime());
    expect(sum(rows)).toBe(20000);
  });

  it("credits a renewal with the renewal rule and the snapshotted share", async () => {
    const { seller, stamp } = await pair(70);
    const owner = await prisma.user.create({ data: { email: `ren-${stamp}@example.test`, role: "USER" } });
    users.push(owner.id);
    await prisma.business.create({
      data: { ownerId: owner.id, name: `Renew ${stamp}`, slug: `renew-${stamp}`, agentId: seller.id }
    });
    const rule = await prisma.commissionRule.create({
      data: { agentId: seller.id, hardware: false, firstBasis: "FLAT", firstFlatPaise: 1000, renewalBasis: "FLAT", renewalFlatPaise: 8000 }
    });
    rules.push(rule.id);
    const earlier = await prisma.payment.create({
      data: { userId: owner.id, amount: 100, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    const payment = await prisma.payment.create({
      data: { userId: owner.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    payments.push(earlier.id, payment.id);
    await creditRenewalCommission(owner.id, payment.id, payment.amount);
    const rows = await prisma.shopCommission.findMany({ where: { paymentId: payment.id } });
    expect(rows.find((row) => row.agentId === seller.id)).toMatchObject({ kind: "RENEWAL", amountPaise: 5600, saleKind: "RENEWAL" });
    expect(sum(rows)).toBe(8000);
  });

  it("splits a hardware pool inside the same source", async () => {
    const { leader, seller } = await pair(70);
    const sourceId = `hw-${seller.id}`;
    await creditPooledCommission({
      sellerId: seller.id,
      sellerKind: "HARDWARE",
      poolPaise: 20000,
      sourceId,
      percent: 10,
      saleKind: "HARDWARE"
    });
    const rows = await prisma.shopCommission.findMany({ where: { sourceId } });
    expect(rows.find((row) => row.agentId === seller.id)?.kind).toBe("HARDWARE");
    expect(rows.find((row) => row.agentId === leader.id)?.kind).toBe("TEAM_OVERRIDE");
    expect(sum(rows)).toBe(20000);
  });

  it("reverses every split when the payment is refunded", async () => {
    const { seller, stamp } = await pair(70);
    const owner = await prisma.user.create({ data: { email: `ref-${stamp}@example.test`, role: "USER" } });
    users.push(owner.id);
    const payment = await prisma.payment.create({
      data: { userId: owner.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    payments.push(payment.id);
    const sourceId = payment.id;
    await creditPooledCommission({
      sellerId: seller.id,
      sellerKind: "SALE",
      poolPaise: 20000,
      sourceId,
      paymentId: payment.id,
      percent: 10
    });
    const count = await reverseCommissionsForPayment(sourceId);
    expect(count).toBe(2);
    const rows = await prisma.shopCommission.findMany({ where: { sourceId } });
    expect(rows.every((row) => row.status === "REVERSED" && row.reversedAt)).toBe(true);
  });

  it("pays a paused member nothing new and gives that share to the leader", async () => {
    const { leader, seller } = await pair(70, "PAUSED");
    const sourceId = `pause-${seller.id}`;
    await creditPooledCommission({
      sellerId: seller.id,
      sellerKind: "SALE",
      poolPaise: 20000,
      sourceId,
      percent: 10
    });
    const rows = await prisma.shopCommission.findMany({ where: { sourceId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ agentId: leader.id, kind: "TEAM_OVERRIDE", amountPaise: 20000 });
  });

  it("keeps the old snapshot when a share changes", async () => {
    const { seller } = await pair(70);
    await creditPooledCommission({
      sellerId: seller.id,
      sellerKind: "SALE",
      poolPaise: 20000,
      sourceId: `old-${seller.id}`,
      percent: 10
    });
    await prisma.agentProfile.update({ where: { userId: seller.id }, data: { sharePercent: 80 } });
    await creditPooledCommission({
      sellerId: seller.id,
      sellerKind: "SALE",
      poolPaise: 20000,
      sourceId: `new-${seller.id}`,
      percent: 10
    });
    const oldRow = await prisma.shopCommission.findFirst({ where: { agentId: seller.id, sourceId: `old-${seller.id}` } });
    const newRow = await prisma.shopCommission.findFirst({ where: { agentId: seller.id, sourceId: `new-${seller.id}` } });
    expect(oldRow).toMatchObject({ amountPaise: 14000, sharePercent: 70 });
    expect(newRow).toMatchObject({ amountPaise: 16000, sharePercent: 80 });
  });

  it("splits three levels when the depth setting allows it", async () => {
    await saveTeamProgramSettings({ maxTeamDepth: 3, minSharePercent: 50, maxSharePercent: 90, autoApproveSubAgents: false, tdsPercent: 5, tdsYearlyThresholdPaise: 1_500_000 });
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const top = await prisma.user.create({ data: { email: `top-${stamp}@example.test`, role: "AGENT" } });
    const mid = await prisma.user.create({ data: { email: `mid-${stamp}@example.test`, role: "AGENT" } });
    const seller = await prisma.user.create({ data: { email: `deep-${stamp}@example.test`, role: "AGENT" } });
    users.push(top.id, mid.id, seller.id);
    const topProfile = await prisma.agentProfile.create({
      data: { userId: top.id, code: `T${stamp}`.slice(0, 12).toUpperCase(), depth: 1, status: "ACTIVE" }
    });
    const midProfile = await prisma.agentProfile.create({
      data: { userId: mid.id, code: `D${stamp}`.slice(0, 12).toUpperCase(), depth: 2, status: "ACTIVE", sharePercent: 60, leaderId: topProfile.id }
    });
    await prisma.agentProfile.create({
      data: { userId: seller.id, code: `E${stamp}`.slice(0, 12).toUpperCase(), depth: 3, status: "ACTIVE", sharePercent: 70, leaderId: midProfile.id }
    });
    const sourceId = `deep-${stamp}`;
    await creditPooledCommission({ sellerId: seller.id, sellerKind: "SALE", poolPaise: 201, sourceId, percent: 10 });
    const rows = await prisma.shopCommission.findMany({ where: { sourceId } });
    expect(rows.find((row) => row.agentId === seller.id)?.amountPaise).toBe(140);
    expect(rows.find((row) => row.agentId === mid.id)?.amountPaise).toBe(36);
    expect(rows.find((row) => row.agentId === top.id)?.amountPaise).toBe(25);
    expect(sum(rows)).toBe(201);
    await saveTeamProgramSettings({ maxTeamDepth: 2, minSharePercent: 50, maxSharePercent: 90, autoApproveSubAgents: false, tdsPercent: 5, tdsYearlyThresholdPaise: 1_500_000 });
  });
});

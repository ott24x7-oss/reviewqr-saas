import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { creditRenewalCommission } from "../../lib/shop/renewal-commission";

describe("agent self payment", () => {
  const users: string[] = [];
  const payments: string[] = [];
  const rules: string[] = [];

  afterAll(async () => {
    if (rules.length) await prisma.commissionRule.deleteMany({ where: { id: { in: rules } } });
    if (payments.length) {
      await prisma.shopCommission.deleteMany({ where: { paymentId: { in: payments } } });
      await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    }
    if (users.length) {
      await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
      await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("pays another owner and not a business the agent created for himself", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const agent = await prisma.user.create({ data: { email: `self-agent-${stamp}@example.test`, role: "AGENT" } });
    const owner = await prisma.user.create({ data: { email: `self-owner-${stamp}@example.test` } });
    users.push(agent.id, owner.id);
    await prisma.agentProfile.create({ data: { userId: agent.id, code: `S${stamp}`.slice(0, 16).toUpperCase() } });
    await prisma.business.create({
      data: { ownerId: agent.id, name: "Own Cafe", slug: `own-cafe-${stamp}`, agentId: agent.id }
    });
    await prisma.business.create({
      data: { ownerId: owner.id, name: "Their Cafe", slug: `their-cafe-${stamp}`, agentId: agent.id }
    });
    const rule = await prisma.commissionRule.create({
      data: {
        agentId: agent.id,
        hardware: false,
        firstBasis: "FLAT",
        firstFlatPaise: 5000,
        renewalBasis: "FLAT",
        renewalFlatPaise: 5000
      }
    });
    rules.push(rule.id);
    const own = await prisma.payment.create({
      data: { userId: agent.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    const theirs = await prisma.payment.create({
      data: { userId: owner.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    payments.push(own.id, theirs.id);
    await creditRenewalCommission(agent.id, own.id, own.amount);
    await creditRenewalCommission(owner.id, theirs.id, theirs.amount);
    expect(await prisma.shopCommission.count({ where: { paymentId: own.id } })).toBe(0);
    const credited = await prisma.shopCommission.findFirst({ where: { paymentId: theirs.id } });
    expect(credited?.agentId).toBe(agent.id);
    expect(credited?.amountPaise).toBe(5000);
  });
});

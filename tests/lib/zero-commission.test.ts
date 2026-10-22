import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { commissionAmount } from "../../lib/plans/commission-rules";
import { queueReferralReward } from "../../lib/plans/rewards";
import { settleConfirmedPayment } from "../../lib/plans/settle";

describe("zero payments", () => {
  const users: string[] = [];
  const payments: string[] = [];
  const rules: string[] = [];

  afterAll(async () => {
    if (rules.length) await prisma.commissionRule.deleteMany({ where: { id: { in: rules } } });
    if (payments.length) {
      await prisma.shopCommission.deleteMany({ where: { paymentId: { in: payments } } });
      await prisma.referralReward.deleteMany({ where: { paymentId: { in: payments } } });
      await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    }
    if (users.length) {
      await prisma.signupAttribution.deleteMany({ where: { userId: { in: users } } });
      await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
      await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
      await prisma.ownerReferral.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("does not pay a flat commission or a referral reward when the amount is zero", async () => {
    expect(commissionAmount("FLAT", 0, 5000, 0)).toBe(0);
    expect(commissionAmount("PERCENT", 10, 0, 0)).toBe(0);
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const agent = await prisma.user.create({ data: { email: `zero-agent-${stamp}@example.test`, role: "AGENT" } });
    const owner = await prisma.user.create({ data: { email: `zero-owner-${stamp}@example.test` } });
    const referrer = await prisma.user.create({ data: { email: `zero-referrer-${stamp}@example.test` } });
    users.push(agent.id, owner.id, referrer.id);
    await prisma.agentProfile.create({ data: { userId: agent.id, code: `Z${stamp}`.slice(0, 12).toUpperCase() } });
    await prisma.ownerReferral.create({ data: { userId: referrer.id, code: `R${stamp}`.slice(0, 12).toUpperCase() } });
    await prisma.business.create({
      data: { ownerId: owner.id, name: "Zero Cafe", slug: `zero-cafe-${stamp}`, agentId: agent.id }
    });
    await prisma.signupAttribution.create({
      data: { userId: owner.id, referrerUserId: referrer.id, code: `R${stamp}`.slice(0, 12).toUpperCase() }
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
    const payment = await prisma.payment.create({
      data: { userId: owner.id, amount: 0, status: "COMPLETED", tier: "GROWTH", periodMonths: 1 }
    });
    payments.push(payment.id);
    await settleConfirmedPayment(payment.id);
    await queueReferralReward(payment.id);
    expect(await prisma.shopCommission.count({ where: { paymentId: payment.id } })).toBe(0);
    expect(await prisma.referralReward.count({ where: { paymentId: payment.id } })).toBe(0);
  });
});

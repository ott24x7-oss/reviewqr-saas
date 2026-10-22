import { afterAll, describe, expect, it } from "vitest";
import { addMonths } from "date-fns";
import { prisma } from "../../lib/db";
import { carriedRenewalPaise, prorateCredit } from "../../lib/plans/quote";
import { limitsForTier } from "../../lib/plans/legacy";
import { activateCompletedPayment } from "../../lib/subscription";

describe("early renewal paid value", () => {
  const users: string[] = [];
  const payments: string[] = [];

  afterAll(async () => {
    if (payments.length) await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    if (users.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("keeps leftover value in the new price so the next credit matches the longer end", async () => {
    const now = new Date();
    const startsAt = new Date(now.getTime() - 30 * 86_400_000);
    const endsAt = new Date(now.getTime() + 30 * 86_400_000);
    const user = await prisma.user.create({
      data: {
        email: `renew-${Date.now()}@example.test`,
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    users.push(user.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: "plan_legacy_starter",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("STARTER"),
        tier: "STARTER",
        duration: "MONTH_1",
        status: "ACTIVE",
        startsAt,
        endsAt,
        pricePaise: 10000
      }
    });
    const carried = carriedRenewalPaise({
      now,
      open: { pricePaise: 10000, startsAt, endsAt }
    });
    expect(carried).toBeGreaterThan(4000);
    expect(carried).toBeLessThan(6000);

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 10000,
        creditPaise: 0,
        status: "PENDING",
        tier: "STARTER",
        periodMonths: 1,
        planId: "plan_legacy_starter",
        duration: "MONTH_1",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("STARTER")
      }
    });
    payments.push(payment.id);
    const activated = await activateCompletedPayment({ paymentId: payment.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);

    const saved = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(saved).toBeTruthy();
    if (!saved?.endsAt) return;
    expect(saved.startsAt.getTime()).toBeGreaterThan(now.getTime() - 5_000);
    expect(saved.startsAt.getTime()).toBeLessThan(now.getTime() + 60_000);
    const extended = addMonths(endsAt, 1).getTime();
    expect(Math.abs(saved.endsAt.getTime() - extended)).toBeLessThan(5_000);
    expect(saved.pricePaise).toBeGreaterThan(14000);
    expect(saved.pricePaise).toBeLessThan(16000);
    expect(saved.pricePaise).not.toBe(10000);

    const again = prorateCredit({
      pricePaidPaise: saved.pricePaise,
      startsAt: saved.startsAt,
      endsAt: saved.endsAt
    });
    expect(Math.abs(again - saved.pricePaise)).toBeLessThan(500);
  });
});

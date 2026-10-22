import { afterAll, describe, expect, it } from "vitest";
import { addDays, addMonths, differenceInCalendarDays } from "date-fns";
import { prisma } from "../../lib/db";
import { limitsForTier } from "../../lib/plans/legacy";
import { remainingBonusDays } from "../../lib/plans/quote";
import { activateCompletedPayment } from "../../lib/subscription";

describe("bonus days on an upgrade", () => {
  const users: string[] = [];
  const payments: string[] = [];

  afterAll(async () => {
    if (payments.length) await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    if (users.length) {
      await prisma.referralCredit.deleteMany({ where: { userId: { in: users } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("keeps unused free days and drops days already used", () => {
    const endsAt = new Date("2026-07-01T00:00:00.000Z");
    const inside = new Date("2026-06-20T00:00:00.000Z");
    expect(remainingBonusDays({ endsAt, bonusDays: 15, now: new Date("2026-06-01T00:00:00.000Z") })).toBe(15);
    expect(remainingBonusDays({ endsAt, bonusDays: 15, now: inside })).toBe(differenceInCalendarDays(endsAt, inside));
    expect(remainingBonusDays({ endsAt, bonusDays: 15, now: new Date("2026-07-02T00:00:00.000Z") })).toBe(0);
  });

  it("adds the free suffix to a one-month upgrade instead of dropping it", async () => {
    const now = new Date();
    const endsAt = addDays(now, 40);
    const user = await prisma.user.create({
      data: {
        email: `bonus-${Date.now()}@example.test`,
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
        startsAt: addDays(now, -5),
        endsAt,
        pricePaise: 49900,
        bonusDays: 15
      }
    });
    await prisma.referralCredit.create({ data: { userId: user.id, months: 0, days: 10 } });
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 99900,
        creditPaise: 0,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: "plan_legacy_growth",
        duration: "MONTH_1",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH")
      }
    });
    payments.push(payment.id);
    const activated = await activateCompletedPayment({ paymentId: payment.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);
    const saved = await prisma.subscription.findFirst({ where: { userId: user.id } });
    const credit = await prisma.referralCredit.findUnique({ where: { userId: user.id } });
    expect(credit?.days).toBe(0);
    expect(saved?.bonusDays).toBe(25);
    const paidEnd = addMonths(now, 1);
    const extra = saved?.endsAt ? differenceInCalendarDays(saved.endsAt, paidEnd) : 0;
    expect(extra).toBeGreaterThanOrEqual(24);
    expect(extra).toBeLessThanOrEqual(26);
    expect(saved?.endsAt && saved.endsAt.getTime()).toBeLessThan(addMonths(endsAt, 1).getTime());
  });
});

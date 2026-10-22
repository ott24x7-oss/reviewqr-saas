import { afterAll, describe, expect, it } from "vitest";
import { addDays, addMonths } from "date-fns";
import { prisma } from "../../lib/db";
import { quotePlanCheckout } from "../../lib/plans/checkout";
import { limitsForTier } from "../../lib/plans/legacy";
import { activateCompletedPayment } from "../../lib/subscription";

const DAY = 86_400_000;

describe("upgrade, downgrade and renewal classification", () => {
  const users: string[] = [];
  const plans: string[] = [];

  afterAll(async () => {
    if (users.length) {
      await prisma.shopCommission.deleteMany({ where: { payment: { userId: { in: users } } } });
      await prisma.payment.deleteMany({ where: { userId: { in: users } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    if (plans.length) await prisma.plan.deleteMany({ where: { id: { in: plans } } });
  });

  function stamp() {
    return `${Date.now().toString(36)}${Math.floor(Math.random() * 100000).toString(36)}`;
  }

  async function userOn(input: {
    tier: "STARTER" | "GROWTH" | "AGENCY";
    status: "ACTIVE" | "TRIALING";
    planId: string;
    duration: "MONTH_1" | "YEAR_1";
    startsAt: Date;
    endsAt: Date;
    pricePaise: number;
  }) {
    const user = await prisma.user.create({
      data: {
        email: `classify-${stamp()}@example.test`,
        subscriptionTier: input.tier,
        subscriptionStatus: input.status,
        subscriptionEndsAt: input.endsAt,
        trialEndsAt: input.status === "TRIALING" ? input.endsAt : null
      }
    });
    users.push(user.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: input.planId,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier(input.tier),
        tier: input.tier,
        duration: input.duration,
        status: input.status,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        pricePaise: input.pricePaise
      }
    });
    return user;
  }

  async function planAt(monthlyPaise: number, yearlyPaise?: number) {
    const s = stamp();
    const plan = await prisma.plan.create({
      data: {
        nameEn: `Classify ${s}`,
        nameHi: `वर्ग ${s}`,
        slug: `classify-${s}`,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH"),
        legacyTier: "GROWTH",
        prices: {
          create: [
            { duration: "MONTH_1", pricePaise: monthlyPaise, active: true },
            ...(yearlyPaise ? [{ duration: "YEAR_1" as const, pricePaise: yearlyPaise, active: true }] : [])
          ]
        }
      }
    });
    plans.push(plan.id);
    return plan;
  }

  it("charges a trial user for a yearly plan now instead of scheduling it", async () => {
    const now = new Date();
    const user = await userOn({
      tier: "GROWTH",
      status: "TRIALING",
      planId: "plan_legacy_growth",
      duration: "MONTH_1",
      startsAt: now,
      endsAt: addDays(now, 14),
      pricePaise: 0
    });
    const yearly = await planAt(49900, 449900);
    const quoted = await quotePlanCheckout(user.id, yearly.slug, "YEAR_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBe(0);
    expect(quoted.quote.duePaise).toBe(449900);
  });

  it("compares list prices, not the discounted amount paid", async () => {
    const now = new Date();
    const pricey = await planAt(199900);
    const cheaper = await planAt(149900);
    // Bought the ₹1,999 plan for ₹1,000 after credit.
    const user = await userOn({
      tier: "GROWTH",
      status: "ACTIVE",
      planId: pricey.id,
      duration: "MONTH_1",
      startsAt: now,
      endsAt: addMonths(now, 1),
      pricePaise: 100000
    });
    const quoted = await quotePlanCheckout(user.id, cheaper.slug, "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("downgrade");
    expect(quoted.quote.duePaise).toBe(0);
  });

  it("schedules a yearly to monthly switch on the same plan instead of charging now", async () => {
    const now = new Date();
    const plan = await planAt(99900, 999900);
    const user = await userOn({
      tier: "GROWTH",
      status: "ACTIVE",
      planId: plan.id,
      duration: "YEAR_1",
      startsAt: now,
      endsAt: addMonths(now, 12),
      pricePaise: 999900
    });
    const quoted = await quotePlanCheckout(user.id, plan.slug, "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("downgrade");
    expect(quoted.quote.duePaise).toBe(0);
  });

  it("does not stack a payment without a plan id on top of a paid year", async () => {
    const now = new Date();
    const user = await userOn({
      tier: "STARTER",
      status: "ACTIVE",
      planId: "plan_legacy_starter",
      duration: "YEAR_1",
      startsAt: addDays(now, -1),
      endsAt: addDays(now, 364),
      pricePaise: 499900
    });
    // An old-style tier payment carries no plan id.
    const row = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 299900,
        status: "PENDING",
        tier: "AGENCY",
        periodMonths: 1
      }
    });
    const before = new Date();
    const activated = await activateCompletedPayment({ paymentId: row.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);
    const saved = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(saved?.endsAt).toBeTruthy();
    if (!saved?.endsAt) return;
    // One month from today, not one month after the paid year.
    expect(saved.endsAt.getTime()).toBeLessThan(addMonths(before, 1).getTime() + 2 * DAY);
  });

  it("still renews the same plan and duration from the paid end", async () => {
    const now = new Date();
    const plan = await planAt(99900);
    const endsAt = addDays(now, 20);
    const user = await userOn({
      tier: "GROWTH",
      status: "ACTIVE",
      planId: plan.id,
      duration: "MONTH_1",
      startsAt: addDays(now, -10),
      endsAt,
      pricePaise: 99900
    });
    const row = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 99900,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: plan.id,
        duration: "MONTH_1"
      }
    });
    const activated = await activateCompletedPayment({ paymentId: row.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);
    const saved = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(saved?.endsAt).toBeTruthy();
    if (!saved?.endsAt) return;
    expect(Math.abs(saved.endsAt.getTime() - addMonths(endsAt, 1).getTime())).toBeLessThan(2 * DAY);
  });
});

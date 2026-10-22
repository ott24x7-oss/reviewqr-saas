import { afterAll, describe, expect, it } from "vitest";
import { addDays, addMonths } from "date-fns";
import { prisma } from "../../lib/db";
import { quotePlanCheckout } from "../../lib/plans/checkout";
import { limitsForTier } from "../../lib/plans/legacy";
import { prorateCredit } from "../../lib/plans/quote";
import { activateCompletedPayment } from "../../lib/subscription";

const DAY = 86_400_000;

describe("paid credit and upgrade length", () => {
  const users: string[] = [];
  const plans: string[] = [];

  afterAll(async () => {
    if (users.length) {
      await prisma.referralReward.deleteMany({ where: { referredUserId: { in: users } } });
      await prisma.shopCommission.deleteMany({ where: { payment: { userId: { in: users } } } });
      await prisma.payment.deleteMany({ where: { userId: { in: users } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    if (plans.length) await prisma.plan.deleteMany({ where: { id: { in: plans } } });
  });

  async function userOn(input: {
    email: string;
    tier: "STARTER" | "GROWTH" | "AGENCY";
    status: "ACTIVE" | "TRIALING";
    planId: string;
    duration: "MONTH_1" | "YEAR_1";
    startsAt: Date;
    endsAt: Date;
    pricePaise: number;
    bonusDays?: number;
    trialEndsAt?: Date | null;
  }) {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        subscriptionTier: input.tier,
        subscriptionStatus: input.status,
        subscriptionEndsAt: input.endsAt,
        trialEndsAt: input.trialEndsAt ?? null
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
        pricePaise: input.pricePaise,
        bonusDays: input.bonusDays ?? 0
      }
    });
    return user;
  }

  it("charges about 33 rupees to switch 999-rupee plans on day 1 and grants one month", async () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const startsAt = new Date("2026-10-21T12:00:00.000Z");
    const endsAt = new Date("2026-11-20T12:00:00.000Z");
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const twin = await prisma.plan.create({
      data: {
        nameEn: "Growth twin",
        nameHi: "ग्रोथ ट्विन",
        slug: `growth-twin-${stamp}`,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH"),
        legacyTier: "GROWTH",
        prices: { create: { duration: "MONTH_1", pricePaise: 99900, active: true } }
      }
    });
    plans.push(twin.id);
    const user = await userOn({
      email: `switch-${stamp}@example.test`,
      tier: "GROWTH",
      status: "ACTIVE",
      planId: "plan_legacy_growth",
      duration: "MONTH_1",
      startsAt,
      endsAt,
      pricePaise: 99900
    });
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 99900,
        status: "COMPLETED",
        tier: "GROWTH",
        periodMonths: 1,
        planId: "plan_legacy_growth",
        duration: "MONTH_1",
        createdAt: startsAt
      }
    });

    const quoted = await quotePlanCheckout(user.id, twin.slug, "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBe(96570);
    expect(quoted.quote.duePaise).toBe(3330);

    const due = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: quoted.quote.duePaise,
        creditPaise: quoted.quote.creditPaise,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: twin.id,
        duration: "MONTH_1",
        modules: quoted.modules,
        limits: quoted.limits as object
      }
    });
    const before = new Date();
    const activated = await activateCompletedPayment({ paymentId: due.id, verifiedVia: "test" });
    const after = new Date();
    expect(activated.ok).toBe(true);
    const saved = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(saved?.planId).toBe(twin.id);
    expect(saved?.pricePaise).toBe(3330);
    expect(saved?.bonusDays).toBe(0);
    expect(saved?.endsAt).toBeTruthy();
    if (!saved?.endsAt) return;
    expect(saved.endsAt.getTime()).toBeGreaterThan(addMonths(before, 1).getTime() - 5_000);
    expect(saved.endsAt.getTime()).toBeLessThan(addMonths(after, 1).getTime() + 5_000);
    expect(saved.endsAt.getTime()).toBeLessThan(addMonths(before, 2).getTime() - 20 * DAY);
  });

  it("charges a growth trial the full month and starts that month today", async () => {
    const now = new Date();
    const trialEnd = addDays(now, 14);
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await userOn({
      email: `trial-${stamp}@example.test`,
      tier: "GROWTH",
      status: "TRIALING",
      planId: "plan_legacy_growth",
      duration: "MONTH_1",
      startsAt: now,
      endsAt: trialEnd,
      pricePaise: 0,
      trialEndsAt: trialEnd
    });
    const quoted = await quotePlanCheckout(user.id, "growth", "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBe(0);
    expect(quoted.quote.duePaise).toBe(99900);

    const due = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 99900,
        creditPaise: 0,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: "plan_legacy_growth",
        duration: "MONTH_1",
        modules: quoted.modules,
        limits: quoted.limits as object
      }
    });
    const before = new Date();
    const activated = await activateCompletedPayment({ paymentId: due.id, verifiedVia: "test" });
    const after = new Date();
    expect(activated.ok).toBe(true);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionTier).toBe("GROWTH");
    expect(saved?.subscriptionEndsAt).toBeTruthy();
    if (!saved?.subscriptionEndsAt) return;
    expect(saved.subscriptionEndsAt.getTime()).toBeGreaterThan(addMonths(before, 1).getTime() - 5_000);
    expect(saved.subscriptionEndsAt.getTime()).toBeLessThan(addMonths(after, 1).getTime() + 5_000);
    expect(saved.subscriptionEndsAt.getTime()).toBeLessThan(addMonths(trialEnd, 1).getTime() - 10 * DAY);
  });

  it("gives an admin-comped agency user no credit on a dearer plan", async () => {
    const now = new Date();
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const dearer = await prisma.plan.create({
      data: {
        nameEn: "Agency plus",
        nameHi: "एजेंसी प्लस",
        slug: `agency-plus-${stamp}`,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("AGENCY"),
        legacyTier: "AGENCY",
        prices: { create: { duration: "MONTH_1", pricePaise: 399900, active: true } }
      }
    });
    plans.push(dearer.id);
    const user = await userOn({
      email: `comp-${stamp}@example.test`,
      tier: "AGENCY",
      status: "ACTIVE",
      planId: "plan_legacy_agency",
      duration: "MONTH_1",
      startsAt: addDays(now, -3),
      endsAt: addDays(now, 20),
      pricePaise: 0
    });
    const quoted = await quotePlanCheckout(user.id, dearer.slug, "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBe(0);
    expect(quoted.quote.duePaise).toBe(399900);
  });

  it("credits a legacy starter year from the 499 rupee payment only", async () => {
    const now = new Date();
    const startsAt = addMonths(now, -1);
    const endsAt = addMonths(now, 11);
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await userOn({
      email: `legacy-pay-${stamp}@example.test`,
      tier: "STARTER",
      status: "ACTIVE",
      planId: "plan_legacy_starter",
      duration: "YEAR_1",
      startsAt,
      endsAt,
      pricePaise: 0
    });
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 49900,
        status: "COMPLETED",
        tier: "STARTER",
        periodMonths: 12,
        planId: "plan_legacy_starter",
        duration: "YEAR_1",
        createdAt: startsAt
      }
    });
    const coveredStart = addMonths(endsAt, -12);
    const windowStart = coveredStart.getTime() > startsAt.getTime() ? coveredStart : startsAt;
    const expected = prorateCredit({ pricePaidPaise: 49900, startsAt: windowStart, endsAt, now });
    const catalogue = prorateCredit({ pricePaidPaise: 499900, startsAt: windowStart, endsAt, now });
    const quoted = await quotePlanCheckout(user.id, "growth", "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBe(expected);
    expect(quoted.quote.duePaise).toBe(99900 - expected);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(49900);
    expect(expected).toBeLessThan(catalogue);
  });

  it("carries a 30-day referral bonus once and leaves it out of the credit", async () => {
    const now = new Date("2026-10-22T12:00:00.000Z");
    const startsAt = new Date("2026-10-21T12:00:00.000Z");
    const endsAt = new Date("2026-12-20T12:00:00.000Z");
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const twin = await prisma.plan.create({
      data: {
        nameEn: "Growth bonus twin",
        nameHi: "ग्रोथ बोनस",
        slug: `growth-bonus-${stamp}`,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH"),
        legacyTier: "GROWTH",
        prices: { create: { duration: "MONTH_1", pricePaise: 99900, active: true } }
      }
    });
    plans.push(twin.id);
    const user = await userOn({
      email: `bonus-up-${stamp}@example.test`,
      tier: "GROWTH",
      status: "ACTIVE",
      planId: "plan_legacy_growth",
      duration: "MONTH_1",
      startsAt,
      endsAt,
      pricePaise: 99900,
      bonusDays: 30
    });
    await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 99900,
        status: "COMPLETED",
        tier: "GROWTH",
        periodMonths: 1,
        planId: "plan_legacy_growth",
        duration: "MONTH_1",
        createdAt: startsAt
      }
    });
    const quoted = await quotePlanCheckout(user.id, twin.slug, "MONTH_1", now);
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.creditPaise).toBe(96570);
    expect(quoted.quote.duePaise).toBe(3330);

    const due = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: quoted.quote.duePaise,
        creditPaise: quoted.quote.creditPaise,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: twin.id,
        duration: "MONTH_1",
        modules: quoted.modules,
        limits: quoted.limits as object
      }
    });
    const before = new Date();
    const activated = await activateCompletedPayment({ paymentId: due.id, verifiedVia: "test" });
    const after = new Date();
    expect(activated.ok).toBe(true);
    const saved = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(saved?.bonusDays).toBe(30);
    expect(saved?.pricePaise).toBe(3330);
    expect(saved?.endsAt).toBeTruthy();
    if (!saved?.endsAt) return;
    expect(saved.endsAt.getTime()).toBeGreaterThan(addDays(addMonths(before, 1), 30).getTime() - 5_000);
    expect(saved.endsAt.getTime()).toBeLessThan(addDays(addMonths(after, 1), 30).getTime() + 5_000);
  });
});

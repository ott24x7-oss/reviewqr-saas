import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { expireLapsedSubscriptions } from "../../lib/billing-jobs";
import { quotePlanCheckout, scheduleDowngrade } from "../../lib/plans/checkout";
import { loadEntitlement } from "../../lib/plans/entitlements";
import { limitsForTier } from "../../lib/plans/legacy";
import { quotePlanChange } from "../../lib/plans/quote";
import { activateCompletedPayment } from "../../lib/subscription";

describe("scheduled downgrade", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.referralReward.deleteMany({ where: { referredUserId: { in: users } } });
    await prisma.shopCommission.deleteMany({ where: { payment: { userId: { in: users } } } });
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.subscriptionReminder.deleteMany({ where: { userId: { in: users } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("compares the monthly price, so a cheap year is not a downgrade from a dearer month", () => {
    const yearlyStarterToGrowthMonth = quotePlanChange({
      samePlan: false,
      currentPricePaise: 499900,
      targetPricePaise: 99900,
      creditPaise: 0,
      currentMonths: 12,
      targetMonths: 1
    });
    expect(yearlyStarterToGrowthMonth.kind).toBe("upgrade");
    const growthMonthToStarterYear = quotePlanChange({
      samePlan: false,
      currentPricePaise: 99900,
      targetPricePaise: 499900,
      creditPaise: 0,
      currentMonths: 1,
      targetMonths: 12
    });
    expect(growthMonthToStarterYear.kind).toBe("downgrade");
  });

  it("invoices a trial downgrade to starter yearly and activates it only when paid", async () => {
    const openUntil = new Date(Date.now() + 14 * 86_400_000);
    const user = await prisma.user.create({
      data: {
        email: `down-trial-${Date.now()}@example.test`,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        subscriptionEndsAt: openUntil,
        trialEndsAt: openUntil
      }
    });
    users.push(user.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: "plan_legacy_growth",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH"),
        tier: "GROWTH",
        duration: "MONTH_1",
        status: "TRIALING",
        endsAt: openUntil,
        pricePaise: 0
      }
    });
    const quoted = await quotePlanCheckout(user.id, "starter", "YEAR_1");
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("downgrade");
    expect((await scheduleDowngrade(user.id, quoted)).ok).toBe(true);

    const periodEnd = new Date(Date.now() - 60_000);
    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionEndsAt: periodEnd, trialEndsAt: periodEnd }
    });
    await prisma.subscription.updateMany({ where: { userId: user.id }, data: { endsAt: periodEnd } });
    await expireLapsedSubscriptions(user.id);

    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionStatus).toBe("EXPIRED");
    expect(saved?.subscriptionTier).toBe("GROWTH");
    expect((await loadEntitlement(user.id)).tier).toBe("FREE");
    const row = await prisma.subscription.findFirst({ where: { userId: user.id, status: "EXPIRED" } });
    expect(row?.planId).toBe("plan_legacy_growth");
    expect(row?.pendingPlanId).toBe("plan_legacy_starter");
    expect(
      await prisma.subscription.findFirst({
        where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING"] } }
      })
    ).toBeNull();

    const invoice = await prisma.payment.findFirst({ where: { userId: user.id, status: "PENDING" } });
    expect(invoice?.provider).toBe("YOUPI");
    expect(invoice?.amount).toBe(499900);
    expect(invoice?.planId).toBe("plan_legacy_starter");
    expect(invoice?.duration).toBe("YEAR_1");
    expect(invoice?.creditPaise).toBe(0);
    const reminder = await prisma.subscriptionReminder.findFirst({
      where: { userId: user.id, kind: "pending:plan_legacy_starter" }
    });
    expect(reminder?.periodEnd.toISOString()).toBe(periodEnd.toISOString());

    const activated = await activateCompletedPayment({ paymentId: invoice!.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.subscriptionTier).toBe("STARTER");
    expect(after?.subscriptionStatus).toBe("ACTIVE");
    expect((await loadEntitlement(user.id)).tier).toBe("STARTER");
    const started = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(started?.planId).toBe("plan_legacy_starter");
    expect(started?.pendingPlanId).toBeNull();
    const expired = await prisma.subscription.findFirst({ where: { userId: user.id, status: "EXPIRED" } });
    expect(expired?.pendingPlanId).toBeNull();
  });

  it("never applies a pending downgrade on a subscription that already expired", async () => {
    const endsAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email: `down-expired-${Date.now()}@example.test`,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "EXPIRED",
        subscriptionEndsAt: endsAt
      }
    });
    users.push(user.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: "plan_legacy_growth",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("GROWTH"),
        tier: "GROWTH",
        duration: "MONTH_1",
        status: "EXPIRED",
        endsAt,
        pendingPlanId: "plan_legacy_starter",
        pendingDuration: "YEAR_1",
        pendingModules: ["REVIEWS", "MENU", "STORE"],
        pendingLimits: await limitsForTier("STARTER")
      }
    });
    await expireLapsedSubscriptions(user.id);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionTier).toBe("GROWTH");
    expect(saved?.subscriptionStatus).toBe("EXPIRED");
    expect((await loadEntitlement(user.id)).tier).toBe("FREE");
    const row = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(row?.status).toBe("EXPIRED");
    expect(row?.planId).toBe("plan_legacy_growth");
    expect(row?.pendingPlanId).toBeNull();
    expect(await prisma.payment.count({ where: { userId: user.id } })).toBe(0);
    expect(
      await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE", tier: "STARTER" } })
    ).toBeNull();
  });
});

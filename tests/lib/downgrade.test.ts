import { afterAll, describe, expect, it } from "vitest";
import { addMonths } from "date-fns";
import { prisma } from "../../lib/db";
import { applyDuePlanChanges } from "../../lib/plans/downgrade";
import { limitsForTier } from "../../lib/plans/legacy";
import { quotePlanChange } from "../../lib/plans/quote";
import { hasModule } from "../../lib/plans/entitlements";

describe("scheduled downgrade", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
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

  it("applies the pending plan when the billing job reaches the period end", async () => {
    const endsAt = new Date(Date.now() - 60_000);
    const user = await prisma.user.create({
      data: {
        email: `down-${Date.now()}@example.test`,
        subscriptionTier: "GROWTH",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    users.push(user.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: "plan_legacy_growth",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: limitsForTier("GROWTH"),
        tier: "GROWTH",
        duration: "MONTH_1",
        status: "ACTIVE",
        endsAt,
        pendingPlanId: "plan_legacy_starter",
        pendingDuration: "MONTH_1",
        pendingModules: ["REVIEWS"],
        pendingLimits: limitsForTier("STARTER")
      }
    });
    await applyDuePlanChanges();
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionTier).toBe("STARTER");
    expect(saved?.subscriptionStatus).toBe("ACTIVE");
    const row = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(row?.planId).toBe("plan_legacy_starter");
    expect(row?.pendingPlanId).toBeNull();
    expect(row?.modules).toEqual(["REVIEWS"]);
    expect(row?.endsAt && row.endsAt.getTime()).toBeGreaterThan(Date.now());
    expect(row?.endsAt && row.endsAt.getTime()).toBeLessThan(addMonths(new Date(), 2).getTime());
    expect(await hasModule(user.id, "REVIEWS")).toBe(true);
  });
});

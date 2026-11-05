import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../lib/db";
import { hasModule, loadEntitlement } from "../../lib/plans/entitlements";
import { parseLimits } from "../../lib/plans/catalog";
import { defaultLimitsForTier } from "../../lib/plans/legacy";

const LIMITS = {
  businesses: 5,
  qrCodes: 10,
  products: 50,
  staff: 10,
  aiCalls: 50,
  aiCallsPerMonth: 50,
  locations: 2,
  reviews: 100,
  campaigns: 10,
  reviewTemplates: 20,
  storeProducts: 50,
  storeOrders: 100
};

const userIds: string[] = [];
const planIds: string[] = [];

describe("live plan entitlements", () => {
  afterAll(async () => {
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("follows the current plan row when the subscription snapshot is older", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `plan-live-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date("2027-08-01T00:00:00.000Z")
      }
    });
    userIds.push(user.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Reviews only",
        nameHi: "सिर्फ़ रिव्यू",
        slug: `plan-live-${stamp}`,
        modules: ["REVIEWS"],
        limits: LIMITS,
        legacyTier: "STARTER"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        modules: ["REVIEWS"],
        limits: LIMITS,
        tier: "STARTER",
        status: "ACTIVE",
        endsAt: user.subscriptionEndsAt
      }
    });

    const before = await loadEntitlement(user.id);
    expect(before.modules).toEqual(["REVIEWS"]);

    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        modules: ["REVIEWS", "MENU"],
        limits: { ...LIMITS, locations: 9 }
      }
    });

    const after = await loadEntitlement(user.id);
    expect(after.modules).toEqual(["REVIEWS", "MENU"]);
    expect(after.limits.locations).toBe(9);
    const stored = await prisma.subscription.findFirst({ where: { userId: user.id }, select: { modules: true } });
    expect(stored?.modules).toEqual(["REVIEWS"]);
  });

  it("uses the current legacy plan modules and limits for an active subscription", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `plan-legacy-live-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE"
      }
    });
    userIds.push(user.id);
    const plan = await prisma.plan.create({
      data: {
        id: `plan_legacy_free_test_${stamp}`,
        nameEn: "Legacy reviews only",
        nameHi: "सिर्फ़ रिव्यू",
        slug: `plan-legacy-live-${stamp}`,
        modules: ["REVIEWS"],
        limits: { ...LIMITS, businesses: 2, qrCodes: 3 },
        legacyTier: "FREE"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: LIMITS,
        tier: "FREE",
        status: "ACTIVE"
      }
    });

    const before = await loadEntitlement(user.id);
    expect(before.modules).toEqual(["REVIEWS"]);
    expect(await hasModule(user.id, "MENU")).toBe(false);
    expect(await hasModule(user.id, "STORE")).toBe(false);
    expect(before.limits.businesses).toBe(2);

    await prisma.plan.update({
      where: { id: plan.id },
      data: { limits: { ...LIMITS, businesses: 8, qrCodes: 23 } }
    });
    const after = await loadEntitlement(user.id);
    expect(after.limits.businesses).toBe(8);
    expect(after.limits.qrCodes).toBe(23);
  });

  it("uses the matching Growth plan for a trial user with no subscription row", async () => {
    const plan = await prisma.plan.findUnique({
      where: { id: "plan_legacy_growth" },
      select: { modules: true, limits: true }
    });
    expect(plan).not.toBeNull();
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `plan-trial-growth-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + 7 * 86_400_000)
      }
    });
    userIds.push(user.id);

    const entitlement = await loadEntitlement(user.id);
    expect(entitlement.tier).toBe("GROWTH");
    expect(entitlement.modules).toEqual(plan!.modules);
    expect(entitlement.limits).toEqual(parseLimits(plan!.limits, await defaultLimitsForTier("GROWTH")));
    expect(await prisma.subscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it("uses an active matching legacyTier plan when the canonical legacy row is missing", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Fallback Growth",
        nameHi: "ग्रोथ",
        slug: `plan-growth-fallback-${stamp}`,
        modules: ["REVIEWS"],
        limits: LIMITS,
        legacyTier: "GROWTH",
        sortOrder: -100
      }
    });
    planIds.push(plan.id);
    const user = await prisma.user.create({
      data: {
        email: `plan-trial-fallback-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + 7 * 86_400_000)
      }
    });
    userIds.push(user.id);
    const exactPlanLookup = vi.spyOn(prisma.plan, "findUnique").mockResolvedValue(null as never);
    try {
      const entitlement = await loadEntitlement(user.id);
      expect(entitlement.tier).toBe("GROWTH");
      expect(entitlement.modules).toEqual(["REVIEWS"]);
      expect(entitlement.limits.locations).toBe(LIMITS.locations);
    } finally {
      exactPlanLookup.mockRestore();
    }
  });

  it("falls back to current defaults only when no tier Plan row exists", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `plan-no-row-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE"
      }
    });
    userIds.push(user.id);
    const exactPlanLookup = vi.spyOn(prisma.plan, "findUnique").mockResolvedValue(null as never);
    const activePlanLookup = vi.spyOn(prisma.plan, "findFirst").mockResolvedValue(null as never);
    try {
      const entitlement = await loadEntitlement(user.id);
      expect(entitlement.modules).toEqual(["REVIEWS", "MENU", "STORE"]);
      expect(entitlement.limits).toEqual(await defaultLimitsForTier("FREE"));
      expect(entitlement.limits.qrCodes).toBe(2);
    } finally {
      exactPlanLookup.mockRestore();
      activePlanLookup.mockRestore();
    }
  });
});

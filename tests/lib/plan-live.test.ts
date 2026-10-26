import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { loadEntitlement } from "../../lib/plans/entitlements";

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

describe("live catalogue entitlements", () => {
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
});

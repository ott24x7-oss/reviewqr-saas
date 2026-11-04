import { afterAll, describe, expect, it } from "vitest";
import { AiQuotaError, consumeAiCall, monthKey } from "../../lib/entitlements";
import { prisma } from "../../lib/db";

const LIMITS = {
  businesses: 2,
  qrCodes: 5,
  products: 20,
  staff: 5,
  aiCalls: 5,
  aiCallsPerMonth: 5,
  locations: 2,
  reviews: 100,
  campaigns: 5,
  reviewTemplates: 10,
  storeProducts: 20,
  storeOrders: 100
};

describe("AI call module entitlement", () => {
  const userIds: string[] = [];
  const businessIds: string[] = [];
  const planIds: string[] = [];

  afterAll(async () => {
    if (businessIds.length) {
      await prisma.aiUsage.deleteMany({ where: { businessId: { in: businessIds } } });
      await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    }
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("uses the requested module, keeps REVIEWS as the default, and enforces the monthly cap", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    const owner = await prisma.user.create({
      data: {
        email: `ai-module-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    userIds.push(owner.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Menu and Store",
        nameHi: "मेनू और स्टोर",
        slug: `ai-module-${stamp}`,
        modules: ["MENU", "STORE"],
        limits: LIMITS,
        legacyTier: "STARTER"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: owner.id,
        planId: plan.id,
        modules: ["MENU", "STORE"],
        limits: LIMITS,
        tier: "STARTER",
        status: "ACTIVE",
        endsAt
      }
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "AI Menu", slug: `ai-module-${stamp}` }
    });
    businessIds.push(business.id);

    await expect(consumeAiCall(business.id, "MENU")).resolves.toBeUndefined();
    await expect(consumeAiCall(business.id, "STORE")).resolves.toBeUndefined();
    await expect(consumeAiCall(business.id)).rejects.toMatchObject({ reason: "plan" });

    const usage = await prisma.aiUsage.findUniqueOrThrow({
      where: { businessId_month: { businessId: business.id, month: monthKey() } }
    });
    expect(usage.calls).toBe(2);

    await prisma.aiUsage.update({ where: { id: usage.id }, data: { calls: LIMITS.aiCalls } });
    await expect(consumeAiCall(business.id, "MENU")).rejects.toBeInstanceOf(AiQuotaError);
    expect(
      (await prisma.aiUsage.findUniqueOrThrow({ where: { id: usage.id } })).calls
    ).toBe(LIMITS.aiCalls);
  });
});

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { limit } from "../../lib/plans/entitlements";
import { defaultLimitsForTier, limitsForTier } from "../../lib/plans/legacy";
import { getPricingConfig, invalidateSettingsCache, setPricingConfig } from "../../lib/settings";

const PRICING_KEY = "pricing.plans";

describe("admin pricing limits", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (users.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("uses the Growth Plan row before AppSetting tier defaults", async () => {
    const before = await prisma.appSetting.findUnique({ where: { key: PRICING_KEY } });
    const current = await getPricingConfig();
    const planLimit = (await limitsForTier("GROWTH")).businesses;
    try {
      await setPricingConfig({
        ...current,
        GROWTH: {
          ...current.GROWTH,
          limits: { ...current.GROWTH.limits, businesses: 17 }
        }
      });
      expect((await defaultLimitsForTier("GROWTH")).businesses).toBe(17);
      expect((await limitsForTier("GROWTH")).businesses).toBe(planLimit);
      const priced = await getPricingConfig();
      expect(priced.GROWTH.monthly).toBe(current.GROWTH.monthly);
      expect(priced.GROWTH.yearly).toBe(current.GROWTH.yearly);

      const user = await prisma.user.create({
        data: {
          email: `limits-${Date.now()}@example.test`,
          subscriptionTier: "GROWTH",
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: new Date(Date.now() + 86_400_000)
        }
      });
      users.push(user.id);
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: "plan_legacy_growth",
          modules: ["REVIEWS", "MENU", "STORE"],
          limits: { businesses: 5 },
          tier: "GROWTH",
          status: "ACTIVE",
          endsAt: user.subscriptionEndsAt
        }
      });
      expect(await limit(user.id, "businesses")).toBe(planLimit);
    } finally {
      if (before) {
        await prisma.appSetting.update({
          where: { key: PRICING_KEY },
          data: { value: before.value, updatedBy: before.updatedBy }
        });
      } else {
        await prisma.appSetting.deleteMany({ where: { key: PRICING_KEY } });
      }
      invalidateSettingsCache(PRICING_KEY);
    }
    expect((await limitsForTier("GROWTH")).businesses).toBe(planLimit);
  });
});

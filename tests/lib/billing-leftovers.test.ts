import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { quotePlanCheckout } from "../../lib/plans/checkout";
import { catalogueChargePaise } from "../../lib/plans/catalogue-price";
import { invoicePayPath, invoiceReminderText } from "../../lib/plans/invoice-link";
import { limitsForTier } from "../../lib/plans/legacy";
import { lifetimeChangeError } from "../../lib/plans/quote";

describe("billing leftovers", () => {
  it("names the catalogue price and the invoice pay link", () => {
    const plans = [
      {
        legacyTier: "GROWTH",
        prices: [
          { duration: "MONTH_1", pricePaise: 99900 },
          { duration: "YEAR_1", pricePaise: 999900 }
        ]
      }
    ];
    expect(catalogueChargePaise(plans, "GROWTH", false)).toBe(99900);
    expect(catalogueChargePaise(plans, "GROWTH", true)).toBe(999900);
    expect(catalogueChargePaise(plans, "AGENCY", false)).toBeNull();
    expect(catalogueChargePaise([{ legacyTier: "STARTER", prices: [{ duration: "MONTH_1", pricePaise: 0 }] }], "STARTER", false)).toBeNull();
    expect(invoicePayPath("pay 1")).toBe("/dashboard/billing?pay=pay%201");
    expect(invoiceReminderText({ planName: "Growth", payUrl: "https://app.test/dashboard/billing?pay=pay_1" })).toContain(
      "https://app.test/dashboard/billing?pay=pay_1"
    );
  });

  it("blocks a lifetime plan from becoming a downgrade that never applies", () => {
    expect(
      lifetimeChangeError({ currentLifetime: true, targetLifetime: false, currentPricePaise: 500000, targetPricePaise: 10000 })
    ).toBe("You have a lifetime plan");
    expect(
      lifetimeChangeError({ currentLifetime: true, targetLifetime: true, currentPricePaise: 500000, targetPricePaise: 500000 })
    ).toBe("You have a lifetime plan");
    expect(
      lifetimeChangeError({ currentLifetime: true, targetLifetime: true, currentPricePaise: 500000, targetPricePaise: 800000 })
    ).toBeNull();
    expect(
      lifetimeChangeError({ currentLifetime: false, targetLifetime: false, currentPricePaise: 99900, targetPricePaise: 49900 })
    ).toBeNull();
  });

  describe("checkout", () => {
    const users: string[] = [];
    const plans: string[] = [];

    afterAll(async () => {
      if (users.length) {
        await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
        await prisma.user.deleteMany({ where: { id: { in: users } } });
      }
      if (plans.length) await prisma.plan.deleteMany({ where: { id: { in: plans } } });
    });

    it("refuses a cheaper change and allows a higher lifetime plan", async () => {
      const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
      const limits = await limitsForTier("GROWTH");
      const current = await prisma.plan.create({
        data: {
          nameEn: "Lifetime now",
          nameHi: "लाइफटाइम",
          slug: `life-now-${stamp}`,
          modules: ["REVIEWS", "MENU", "STORE"],
          limits,
          legacyTier: "GROWTH",
          prices: {
            create: [
              { duration: "LIFETIME", pricePaise: 500000, active: true },
              { duration: "MONTH_1", pricePaise: 10000, active: true }
            ]
          }
        }
      });
      const higher = await prisma.plan.create({
        data: {
          nameEn: "Lifetime higher",
          nameHi: "बड़ा लाइफटाइम",
          slug: `life-up-${stamp}`,
          modules: ["REVIEWS", "MENU", "STORE"],
          limits,
          legacyTier: "AGENCY",
          prices: { create: { duration: "LIFETIME", pricePaise: 800000, active: true } }
        }
      });
      plans.push(current.id, higher.id);
      const user = await prisma.user.create({
        data: { email: `life-${stamp}@example.test`, name: "Lifetime owner" }
      });
      users.push(user.id);
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: current.id,
          modules: ["REVIEWS", "MENU", "STORE"],
          limits,
          tier: "GROWTH",
          duration: "LIFETIME",
          status: "ACTIVE",
          startsAt: new Date("2026-01-01T00:00:00.000Z"),
          endsAt: null,
          pricePaise: 500000
        }
      });

      const cheaper = await quotePlanCheckout(user.id, current.slug, "MONTH_1");
      expect(cheaper).toEqual({ ok: false, error: "You have a lifetime plan" });
      const same = await quotePlanCheckout(user.id, current.slug, "LIFETIME");
      expect(same).toEqual({ ok: false, error: "You have a lifetime plan" });
      const upgrade = await quotePlanCheckout(user.id, higher.slug, "LIFETIME");
      expect(upgrade.ok).toBe(true);
      if (!upgrade.ok) return;
      expect(upgrade.quote.kind).toBe("upgrade");
      expect(upgrade.pricePaise).toBe(800000);
    });
  });
});

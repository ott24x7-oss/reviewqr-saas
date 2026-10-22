import { afterAll, describe, expect, it } from "vitest";
import { addMonths, differenceInCalendarDays } from "date-fns";
import { prisma } from "../../lib/db";
import { quotePlanCheckout } from "../../lib/plans/checkout";
import { creditBasePaise, upgradeEndsAt } from "../../lib/plans/quote";
import { limitsForTier } from "../../lib/plans/legacy";
import { activateCompletedPayment } from "../../lib/subscription";

describe("legacy upgrade credit", () => {
  const users: string[] = [];
  const payments: string[] = [];

  afterAll(async () => {
    if (payments.length) await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    if (users.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("turns unused value into days on the new plan instead of stacking the old end", () => {
    expect(creditBasePaise({ snapshotPaise: 0, cataloguePaise: 499900, lastPaymentPaise: 100 })).toBe(499900);
    expect(creditBasePaise({ snapshotPaise: 0, cataloguePaise: 0, lastPaymentPaise: 25000 })).toBe(25000);
    const now = new Date("2026-06-01T00:00:00.000Z");
    const end = upgradeEndsAt({
      now,
      months: 1,
      creditPaise: Math.round((499900 * 11) / 12),
      pricePaise: 99900
    });
    const days = differenceInCalendarDays(end, now);
    expect(days).toBeGreaterThan(40);
    expect(days).toBeLessThan(300);
  });

  it("does not give 12 months of Growth for one paid month after 11 months of Starter", async () => {
    const now = new Date();
    const startsAt = addMonths(now, -1);
    const endsAt = addMonths(now, 11);
    const user = await prisma.user.create({
      data: {
        email: `legacy-up-${Date.now()}@example.test`,
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
        duration: "YEAR_1",
        status: "ACTIVE",
        startsAt,
        endsAt,
        pricePaise: 0
      }
    });
    const quoted = await quotePlanCheckout(user.id, "growth", "MONTH_1");
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;
    expect(quoted.quote.kind).toBe("upgrade");
    expect(quoted.quote.creditPaise).toBeGreaterThan(0);
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: quoted.quote.duePaise,
        creditPaise: quoted.quote.creditPaise,
        status: "PENDING",
        tier: "GROWTH",
        periodMonths: 1,
        planId: quoted.planId,
        duration: "MONTH_1",
        modules: quoted.modules,
        limits: quoted.limits as object
      }
    });
    payments.push(payment.id);
    const activated = await activateCompletedPayment({ paymentId: payment.id, verifiedVia: "test" });
    expect(activated.ok).toBe(true);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    const next = saved?.subscriptionEndsAt;
    expect(next).toBeTruthy();
    if (!next) return;
    expect(next.getTime()).toBeLessThan(addMonths(now, 12).getTime() - 20 * 86_400_000);
    expect(next.getTime()).toBeLessThan(addMonths(endsAt, 1).getTime() - 20 * 86_400_000);
    expect(saved?.subscriptionTier).toBe("GROWTH");
  });
});

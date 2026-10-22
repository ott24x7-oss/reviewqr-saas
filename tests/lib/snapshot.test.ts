import { afterAll, describe, expect, it } from "vitest";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "../../lib/db";
import { fulfillPaidShopOrder } from "../../lib/shop/fulfill";
import { limitsForTier } from "../../lib/plans/legacy";
import { pushRewardEnd } from "../../lib/plans/rewards";
import { editUserSubscription } from "../../lib/plans/snapshot";
import { hasModule, limit } from "../../lib/plans/entitlements";

describe("subscription snapshots from bundles, admin, and referrals", () => {
  const users: string[] = [];
  const products: string[] = [];
  const orders: string[] = [];
  afterAll(async () => {
    if (orders.length) {
      await prisma.shopOrderLine.deleteMany({ where: { orderId: { in: orders } } });
      await prisma.shopOrder.deleteMany({ where: { id: { in: orders } } });
    }
    if (products.length) {
      await prisma.catalogVariant.deleteMany({ where: { productId: { in: products } } });
      await prisma.catalogProduct.deleteMany({ where: { id: { in: products } } });
    }
    if (users.length) {
      await prisma.referralCredit.deleteMany({ where: { userId: { in: users } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  async function buyer(tier: "FREE" | "STARTER") {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `bundle-${stamp}@example.test`,
        subscriptionTier: tier,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: tier === "FREE" ? null : new Date(Date.now() + 20 * 86_400_000)
      }
    });
    users.push(user.id);
    if (tier === "STARTER") {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: "plan_legacy_starter",
          modules: ["REVIEWS", "MENU", "STORE"],
          limits: await limitsForTier("STARTER"),
          tier: "STARTER",
          status: "ACTIVE",
          endsAt: user.subscriptionEndsAt
        }
      });
    }
    return user;
  }

  async function buyGrowth(userId: string) {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const product = await prisma.catalogProduct.create({
      data: { slug: `growth-bundle-${stamp}`, name: "Growth bundle", description: "Test bundle" }
    });
    products.push(product.id);
    const variant = await prisma.catalogVariant.create({
      data: {
        productId: product.id,
        sku: `GROWTH-${stamp}`.slice(0, 40),
        name: "Growth 1 month",
        costPaise: 0,
        mrpPaise: 99900,
        salePaise: 99900,
        hsn: "491199",
        gstPercent: 18,
        weightGrams: 1,
        lengthMm: 1,
        widthMm: 1,
        heightMm: 1,
        stock: 5,
        ships: false,
        includedTier: "GROWTH",
        includedMonths: 1
      }
    });
    const order = await prisma.shopOrder.create({
      data: {
        userId,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
        subtotalPaise: 99900,
        discountPaise: 0,
        totalPaise: 99900,
        taxablePaise: 84661,
        cgstPaise: 7619,
        sgstPaise: 7620,
        igstPaise: 0,
        advancePaise: 99900,
        balancePaise: 0,
        lines: {
          create: {
            variantId: variant.id,
            sku: variant.sku,
            name: variant.name,
            qty: 1,
            unitPaise: 99900,
            hsn: "491199",
            gstPercent: 18,
            discountPaise: 0,
            netPaise: 99900,
            taxablePaise: 84661,
            cgstPaise: 7619,
            sgstPaise: 7620,
            igstPaise: 0,
            ships: false,
            needsDesign: false,
            needsNfc: false,
            weightGrams: 1,
            includedTier: "GROWTH",
            includedMonths: 1
          }
        }
      }
    });
    orders.push(order.id);
    const result = await fulfillPaidShopOrder({ orderId: order.id, verifiedVia: "test" });
    expect(result.ok).toBe(true);
    return order.id;
  }

  it("gives a free buyer the Growth modules and limits", async () => {
    const user = await buyer("FREE");
    await buyGrowth(user.id);
    const row = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(row?.tier).toBe("GROWTH");
    expect(row?.modules).toEqual(["REVIEWS", "MENU", "STORE"]);
    expect(row?.limits).toMatchObject({ businesses: (await limitsForTier("GROWTH")).businesses });
    expect(row?.pricePaise).toBe(0);
    expect(row?.bonusDays).toBeGreaterThan(27);
    expect(row?.bonusDays).toBeLessThan(32);
    expect(row?.endsAt).toBeTruthy();
    expect(await limit(user.id, "businesses")).toBe(5);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionTier).toBe("GROWTH");
  });

  it("switches a Starter buyer to Growth immediately", async () => {
    const user = await buyer("STARTER");
    expect(await limit(user.id, "businesses")).toBe(1);
    const before = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(before?.endsAt).toBeTruthy();
    await prisma.subscription.update({
      where: { id: before!.id },
      data: { pricePaise: 49900, bonusDays: 12 }
    });
    await buyGrowth(user.id);
    expect(await limit(user.id, "businesses")).toBe(5);
    expect(await hasModule(user.id, "STORE")).toBe(true);
    const saved = await prisma.user.findUnique({ where: { id: user.id } });
    expect(saved?.subscriptionTier).toBe("GROWTH");
    const row = await prisma.subscription.findFirst({ where: { userId: user.id, status: "ACTIVE" } });
    expect(row?.tier).toBe("GROWTH");
    expect(row?.planId).toBe("plan_legacy_growth");
    expect(row?.pricePaise).toBe(0);
    expect(row?.endsAt).toBeTruthy();
    if (!before?.endsAt || !row?.endsAt) return;
    expect(row.bonusDays).toBe(12 + differenceInCalendarDays(row.endsAt, before.endsAt));
  });

  it("applies an admin Agency edit to the snapshot", async () => {
    const user = await buyer("FREE");
    const endsAt = new Date(Date.now() + 40 * 86_400_000);
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: "plan_legacy_starter",
        modules: ["REVIEWS", "MENU", "STORE"],
        limits: await limitsForTier("STARTER"),
        tier: "STARTER",
        status: "ACTIVE",
        endsAt,
        pricePaise: 49900,
        bonusDays: 12
      }
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { subscriptionTier: "AGENCY", subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt }
      });
      await editUserSubscription(tx, {
        userId: user.id,
        tier: "AGENCY",
        status: "ACTIVE",
        endsAt
      });
    });
    expect(await limit(user.id, "businesses")).toBe((await limitsForTier("AGENCY")).businesses);
    expect(await hasModule(user.id, "MENU")).toBe(true);
    const row = await prisma.subscription.findFirst({ where: { userId: user.id } });
    expect(row?.tier).toBe("AGENCY");
    expect(row?.planId).toBe("plan_legacy_agency");
    expect(row?.endsAt?.toISOString()).toBe(endsAt.toISOString());
    expect(row?.pricePaise).toBe(0);
    expect(row?.bonusDays).toBe(12);
  });

  it("moves the snapshot end when a referral reward extends the plan", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const referrer = await prisma.user.create({
      data: {
        email: `referrer-${stamp}@example.test`,
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date("2027-01-01T00:00:00.000Z")
      }
    });
    users.push(referrer.id);
    await prisma.subscription.create({
      data: {
        userId: referrer.id,
        planId: "plan_legacy_starter",
        modules: ["STORE"],
        limits: await limitsForTier("STARTER"),
        tier: "STARTER",
        status: "ACTIVE",
        endsAt: referrer.subscriptionEndsAt
      }
    });
    await pushRewardEnd(referrer.id, new Date("2027-02-01T00:00:00.000Z"));
    const row = await prisma.subscription.findFirst({ where: { userId: referrer.id } });
    expect(row?.endsAt?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
    expect(row?.modules).toEqual(["STORE"]);
    const saved = await prisma.user.findUnique({ where: { id: referrer.id } });
    expect(saved?.subscriptionEndsAt?.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });
});

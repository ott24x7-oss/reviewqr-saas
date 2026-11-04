import { afterAll, describe, expect, it } from "vitest";
import { claimQrCode } from "../../lib/tap/qr-api";
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

describe("QR stock claim feature gate", () => {
  const userIds: string[] = [];
  const businessIds: string[] = [];
  const planIds: string[] = [];
  const stockCodeIds: string[] = [];

  afterAll(async () => {
    if (stockCodeIds.length) await prisma.qRCode.deleteMany({ where: { id: { in: stockCodeIds } } });
    if (businessIds.length) await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("requires multiple-qrs before assigning stock when the owner already has a QR", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    const owner = await prisma.user.create({
      data: {
        email: `qr-claim-gate-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    userIds.push(owner.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Store only",
        nameHi: "सिर्फ़ स्टोर",
        slug: `qr-claim-gate-${stamp}`,
        modules: ["STORE"],
        limits: LIMITS,
        legacyTier: "STARTER"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: owner.id,
        planId: plan.id,
        modules: ["STORE"],
        limits: LIMITS,
        tier: "STARTER",
        status: "ACTIVE",
        endsAt
      }
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "QR claim cafe", slug: `qr-claim-gate-${stamp}` }
    });
    businessIds.push(business.id);
    await prisma.qRCode.create({
      data: { businessId: business.id, label: "Counter", shortCode: `EXIST-${stamp}`.slice(0, 32) }
    });
    const stock = await prisma.qRCode.create({
      data: {
        label: "Pre-printed stock",
        shortCode: `STOCK-${stamp}`.slice(0, 32),
        status: "UNASSIGNED"
      }
    });
    stockCodeIds.push(stock.id);

    const result = await claimQrCode(
      owner.id,
      business.id,
      { code: stock.shortCode, confirm: true },
      { ip: "127.0.0.1" }
    );

    expect(result).toMatchObject({
      ok: false,
      status: 403,
      body: { code: "PLAN_REQUIRED", feature: "multiple-qrs" }
    });
    expect((await prisma.qRCode.findUniqueOrThrow({ where: { id: stock.id } })).businessId).toBeNull();
  });
});

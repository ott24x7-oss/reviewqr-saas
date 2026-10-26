import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as subscriptionGet } from "../../app/api/v1/subscription/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

const LIMITS = {
  businesses: 5,
  qrCodes: 10,
  products: 50,
  staff: 10,
  aiCalls: 50,
  aiCallsPerMonth: 50,
  locations: 10,
  reviews: 100,
  campaigns: 10,
  reviewTemplates: 20,
  storeProducts: 50,
  storeOrders: 100
};

describe("staff subscription follows the business owner", () => {
  const userIds: string[] = [];
  const planIds: string[] = [];
  const businessIds: string[] = [];

  afterAll(async () => {
    if (businessIds.length) await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    if (userIds.length) {
      await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("returns the owner's modules when staff pass businessId", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    const owner = await prisma.user.create({
      data: { email: `sub-owner-${stamp}@example.test`, role: "USER", subscriptionTier: "STARTER", subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt }
    });
    const staff = await prisma.user.create({
      data: { email: `sub-staff-${stamp}@example.test`, role: "USER", subscriptionTier: "STARTER", subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt }
    });
    userIds.push(owner.id, staff.id);
    const reviewsPlan = await prisma.plan.create({
      data: { nameEn: "Reviews", nameHi: "Reviews", slug: `sub-reviews-${stamp}`, modules: ["REVIEWS"], limits: LIMITS, legacyTier: "STARTER" }
    });
    const storePlan = await prisma.plan.create({
      data: { nameEn: "Store", nameHi: "Store", slug: `sub-store-${stamp}`, modules: ["STORE"], limits: LIMITS, legacyTier: "STARTER" }
    });
    planIds.push(reviewsPlan.id, storePlan.id);
    await prisma.subscription.create({
      data: { userId: owner.id, planId: reviewsPlan.id, modules: ["REVIEWS"], limits: LIMITS, tier: "STARTER", status: "ACTIVE", endsAt }
    });
    await prisma.subscription.create({
      data: { userId: staff.id, planId: storePlan.id, modules: ["STORE"], limits: LIMITS, tier: "STARTER", status: "ACTIVE", endsAt }
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Owner reviews", slug: `sub-reviews-${stamp}` }
    });
    businessIds.push(business.id);
    await prisma.businessMember.create({ data: { businessId: business.id, userId: staff.id, role: "STAFF" } });
    const token = (await issueTokenPair(staff, { deviceName: "subscription-staff" })).accessToken;

    const own = await subscriptionGet(new NextRequest("http://127.0.0.1/api/v1/subscription", { headers: { authorization: `Bearer ${token}` } }));
    const ownBody = await own.json();
    expect(own.status).toBe(200);
    expect(ownBody.data.modules).toEqual(["STORE"]);

    const inherited = await subscriptionGet(
      new NextRequest(`http://127.0.0.1/api/v1/subscription?businessId=${business.id}`, { headers: { authorization: `Bearer ${token}` } })
    );
    const inheritedBody = await inherited.json();
    expect(inherited.status).toBe(200);
    expect(inheritedBody.data.modules).toEqual(["REVIEWS"]);
    expect(inheritedBody.data.plan.slug).toBe(reviewsPlan.slug);

    const missed = await subscriptionGet(
      new NextRequest("http://127.0.0.1/api/v1/subscription?businessId=missing-business", { headers: { authorization: `Bearer ${token}` } })
    );
    const missedBody = await missed.json();
    expect(missed.status).toBe(200);
    expect(missedBody.data.modules).toEqual(["STORE"]);
  });
});

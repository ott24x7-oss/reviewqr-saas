import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    email: string;
    name: string;
    role: "USER";
    subscriptionTier: "STARTER";
    subscriptionStatus: "ACTIVE";
    trialEndsAt: null;
    subscriptionEndsAt: Date | null;
  }
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../../lib/auth")>("../../lib/auth");
  return {
    ...actual,
    requireUser: async () => {
      if (!session.user) throw new Error("UNAUTHORIZED");
      return session.user;
    }
  };
});

import { POST as inviteMember } from "../../app/api/businesses/[id]/members/route";
import { inviteStaff } from "../../lib/owner/mobile-extra";
import { prisma } from "../../lib/db";

const LIMITS = {
  businesses: 2,
  qrCodes: 5,
  products: 20,
  staff: 1,
  aiCalls: 5,
  aiCallsPerMonth: 5,
  locations: 2,
  reviews: 100,
  campaigns: 5,
  reviewTemplates: 10,
  storeProducts: 20,
  storeOrders: 100
};

describe("staff invites use staff seats", () => {
  const userIds: string[] = [];
  const businessIds: string[] = [];
  const planIds: string[] = [];

  afterAll(async () => {
    if (businessIds.length) await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    if (userIds.length) {
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  async function setup() {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    const user = await prisma.user.create({
      data: {
        email: `staff-limit-${stamp}@example.test`,
        name: "Staff owner",
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: endsAt
      }
    });
    userIds.push(user.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "One staff seat",
        nameHi: "एक स्टाफ़ सीट",
        slug: `staff-limit-${stamp}`,
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
        endsAt
      }
    });
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: "Staff limit cafe", slug: `staff-limit-${stamp}` }
    });
    businessIds.push(business.id);
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name || "Staff owner",
      role: "USER",
      subscriptionTier: "STARTER",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: null,
      subscriptionEndsAt: endsAt
    };
    return { user, business, stamp };
  }

  function request(businessId: string) {
    return new NextRequest(`http://127.0.0.1/api/businesses/${businessId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "new-staff@example.test", role: "STAFF" })
    });
  }

  it("blocks both invite paths when an active staff record uses the last seat", async () => {
    const { user, business, stamp } = await setup();
    await prisma.staff.create({
      data: { businessId: business.id, name: "Existing staff", slug: `existing-${stamp}` }
    });

    const web = await inviteMember(request(business.id), { params: { id: business.id } });
    const mobile = await inviteStaff(user.id, business.id, "new-staff@example.test");
    const expected = "Your STARTER plan allows 1 staff. Upgrade to add more.";

    expect(web.status).toBe(402);
    expect((await web.json()).error).toBe(expected);
    expect(mobile).toMatchObject({ ok: false, status: 402, error: expected });
    expect(await prisma.businessInvite.count({ where: { businessId: business.id } })).toBe(0);
  });

  it("counts pending email invites against the same staff limit", async () => {
    const { user, business, stamp } = await setup();
    await prisma.businessInvite.create({
      data: {
        businessId: business.id,
        email: `pending-${stamp}@example.test`,
        role: "STAFF",
        tokenHash: `staff-limit-token-${stamp}`,
        expiresAt: new Date(Date.now() + 60_000)
      }
    });

    const web = await inviteMember(request(business.id), { params: { id: business.id } });
    const mobile = await inviteStaff(user.id, business.id, "new-staff@example.test");
    const expected = "Your STARTER plan allows 1 staff. Upgrade to add more.";

    expect(web.status).toBe(402);
    expect((await web.json()).error).toBe(expected);
    expect(mobile).toMatchObject({ ok: false, status: 402, error: expected });
    expect(await prisma.businessInvite.count({ where: { businessId: business.id } })).toBe(1);
  });
});

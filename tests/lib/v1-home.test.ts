import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as dashboardGet } from "../../app/api/v1/dashboard/route";
import { GET as placesGet } from "../../app/api/v1/places/search/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 home and places", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.qrScan.deleteMany({ where: { qrCode: { business: { ownerId: { in: users } } } } });
    await prisma.feedback.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.review.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.menuOrder.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.qRCode.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, path: string) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest(`http://127.0.0.1${path}`, {
      headers: { authorization: `Bearer ${pair.accessToken}` }
    });
  }

  it("counts today's orders, feedback, and scans for the signed-in owner", async () => {
    const user = await prisma.user.create({
      data: { email: `home-${Date.now()}@example.test`, role: "USER", subscriptionTier: "STARTER" }
    });
    users.push(user.id);
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: "Home Cafe", slug: `home-cafe-${Date.now()}` }
    });
    const qr = await prisma.qRCode.create({
      data: { businessId: business.id, label: "Counter", shortCode: `h${Date.now().toString(36)}` }
    });
    await prisma.menuOrder.create({
      data: { businessId: business.id, number: `H${Date.now()}`, totalPaise: 10000, items: [] }
    });
    const review = await prisma.review.create({
      data: { businessId: business.id, rating: 5, sentiment: "POSITIVE" }
    });
    await prisma.feedback.create({
      data: { reviewId: review.id, businessId: business.id, message: "Loved it" }
    });
    await prisma.qrScan.create({ data: { qrCodeId: qr.id, ipHash: "abc", event: "view" } });

    const res = await dashboardGet(await authed(user, `/api/v1/dashboard?businessId=${business.id}`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ordersToday).toBe(1);
    expect(json.data.feedbackToday).toBe(1);
    expect(json.data.scansToday).toBe(1);
    expect(json.data.plan.tier).toBe("STARTER");
    expect(json.data.businessId).toBe(business.id);
  });

  it("hides another owner's business", async () => {
    const owner = await prisma.user.create({ data: { email: `home-a-${Date.now()}@example.test`, role: "USER" } });
    const other = await prisma.user.create({ data: { email: `home-b-${Date.now()}@example.test`, role: "USER" } });
    users.push(owner.id, other.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Private", slug: `private-${Date.now()}` }
    });
    const res = await dashboardGet(await authed(other, `/api/v1/dashboard?businessId=${business.id}`));
    expect(res.status).toBe(404);
  });

  it("returns an empty Places list when the server key is unset", async () => {
    const user = await prisma.user.create({ data: { email: `places-${Date.now()}@example.test`, role: "USER" } });
    users.push(user.id);
    const previous = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    try {
      const res = await placesGet(await authed(user, "/api/v1/places/search?q=cafe"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual({ enabled: false, predictions: [] });
    } finally {
      if (previous) process.env.GOOGLE_PLACES_API_KEY = previous;
    }
  });

  it("rejects Places search with a bad token", async () => {
    const res = await placesGet(
      new NextRequest("http://127.0.0.1/api/v1/places/search?q=cafe", {
        headers: { authorization: "Bearer not-a-token" }
      })
    );
    expect(res.status).toBe(401);
  });
});

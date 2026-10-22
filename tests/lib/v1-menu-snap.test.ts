import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as snapPost } from "../../app/api/v1/businesses/[id]/menu/snap/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 menu photo", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, path: string, body: unknown) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest(`http://127.0.0.1${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${pair.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  it("does not read a photo on someone else's menu", async () => {
    const owner = await prisma.user.create({ data: { email: `snap-a-${Date.now()}@example.test`, role: "USER" } });
    const other = await prisma.user.create({ data: { email: `snap-b-${Date.now()}@example.test`, role: "USER" } });
    users.push(owner.id, other.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Snap", slug: `snap-${Date.now()}` }
    });
    const res = await snapPost(await authed(other, `/api/v1/businesses/${business.id}/menu/snap`, { image: "x".repeat(40) }), {
      params: { id: business.id }
    });
    expect(res.status).toBe(404);
  });

  it("rejects a bad photo or says the reader is off", async () => {
    const user = await prisma.user.create({ data: { email: `snap-c-${Date.now()}@example.test`, role: "USER" } });
    users.push(user.id);
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: "Snap self", slug: `snap-self-${Date.now()}` }
    });
    const res = await snapPost(
      await authed(user, `/api/v1/businesses/${business.id}/menu/snap`, { image: "not-a-photo-".repeat(4) }),
      { params: { id: business.id } }
    );
    expect([400, 503]).toContain(res.status);
  });
});

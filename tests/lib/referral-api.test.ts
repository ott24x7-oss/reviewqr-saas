import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../../lib/db";
import { ownerReferralHomeSchema } from "../../packages/shared/src/mobile";

const authState = vi.hoisted(() => ({ userId: "" }));
vi.mock("../../lib/api/v1", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api/v1")>();
  return {
    ...actual,
    requireV1User: async () => ({
      ok: true as const,
      user: { id: authState.userId, email: "", name: null, phone: null, role: "USER", pushEnabled: false, sessionId: null }
    })
  };
});
import { GET as getRefer } from "../../app/api/v1/refer/route";

const userIds: string[] = [];
const businessIds: string[] = [];
let databaseAvailable = false;

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseAvailable = true;
  } catch {
    databaseAvailable = false;
  }
});

afterAll(async () => {
  if (!databaseAvailable) return;
  try {
    if (businessIds.length) await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    if (userIds.length) {
      await prisma.signupAttribution.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  } catch {
    // The local Postgres service may be unavailable during the requested checks.
  }
});

describe("owner referral API response", () => {
  it("returns settings and masks referred contact details", async (context) => {
    if (!databaseAvailable) context.skip();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const phoneTail = suffix.replace(/\D/g, "").slice(-8);
    const ownerPhone = `+9198${phoneTail}`;
    const friendPhone = `+9197${phoneTail}`;
    const owner = await prisma.user.create({
      data: { email: `referrer-${suffix}@example.test`, phone: ownerPhone, name: "Referring owner" }
    });
    userIds.push(owner.id);
    authState.userId = owner.id;
    const friend = await prisma.user.create({
      data: { email: `private-friend-${suffix}@example.test`, phone: friendPhone, name: "Friend owner" }
    });
    userIds.push(friend.id);
    const business = await prisma.business.create({
      data: {
        ownerId: friend.id,
        name: `Madhav Sweets ${friendPhone} ${friend.email}`,
        slug: `referral-${suffix}`
      }
    });
    businessIds.push(business.id);
    await prisma.signupAttribution.create({
      data: { userId: friend.id, referrerUserId: owner.id, code: `OWNER${suffix.replace(/\D/g, "").slice(0, 10)}` }
    });

    const response = await getRefer(new NextRequest("https://qr24x7.in/api/v1/refer"));
    const body = await response.json() as { data: unknown };
    const data = ownerReferralHomeSchema.parse(body.data);
    const serialized = JSON.stringify(data);

    expect(data.referrals).toHaveLength(1);
    expect(data.referrals[0]).toMatchObject({ displayName: "Madhav Sweets", stage: "SIGNED_UP", months: 0 });
    expect(serialized).not.toContain(friend.email);
    expect(serialized).not.toContain(friendPhone);
    expect(serialized).not.toContain(owner.email);
    expect(serialized).not.toContain(ownerPhone);
  });
});

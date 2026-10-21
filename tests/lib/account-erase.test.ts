import { afterAll, describe, expect, it } from "vitest";
import { eraseAccount } from "../../lib/account";
import { prisma } from "../../lib/db";
import { anonymizedEmail } from "../../lib/privacy";
import { hashToken } from "../../lib/tokens";

describe("account erasure", () => {
  const created: string[] = [];

  afterAll(async () => {
    if (!created.length) return;
    await prisma.payment.deleteMany({ where: { userId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("removes refresh sessions and push devices and keeps the payment", async () => {
    const user = await prisma.user.create({
      data: { email: `erase-${Date.now()}@example.test`, role: "USER", pushEnabled: true }
    });
    created.push(user.id);
    const payment = await prisma.payment.create({
      data: { userId: user.id, amount: 10000, tier: "STARTER" }
    });
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        familyId: "fam-erase",
        tokenHash: hashToken(`refresh-${user.id}`),
        expiresAt: new Date(Date.now() + 86_400_000)
      }
    });
    await prisma.pushDevice.create({
      data: { userId: user.id, token: `ExponentPushToken[${user.id}]`, platform: "ANDROID" }
    });

    await eraseAccount(user.id);

    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.email).toBe(anonymizedEmail(user.id));
    expect(row?.deletedAt).toBeTruthy();
    expect(row?.pushEnabled).toBe(false);
    expect(await prisma.payment.findUnique({ where: { id: payment.id } })).toBeTruthy();
    expect(await prisma.refreshSession.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.pushDevice.count({ where: { userId: user.id } })).toBe(0);
  });
});

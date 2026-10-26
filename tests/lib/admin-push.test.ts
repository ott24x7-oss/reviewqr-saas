import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { queueAdminPush, scanAdminPaymentAlerts } from "../../lib/admin/push";

const stamp = Date.now();
const users: string[] = [];
const liveToken = `ExponentPushToken[live-${stamp}]`;
const quietToken = `ExponentPushToken[quiet-${stamp}]`;
const deadToken = `ExponentPushToken[dead-${stamp}]`;
const ownerToken = `ExponentPushToken[owner-${stamp}]`;
const pendingToken = `ExponentPushToken[pending-${stamp}]`;

function fetchImpl(seen: string[][]) {
  const impl: typeof fetch = async (_url, init) => {
    const messages = JSON.parse(String(init?.body)) as Array<{ to: string }>;
    seen.push(messages.map((message) => message.to));
    return new Response(
      JSON.stringify({
        data: messages.map((message) =>
          message.to === deadToken
            ? { status: "error", details: { error: "DeviceNotRegistered" } }
            : { status: "ok" }
        )
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };
  return impl;
}

describe("admin push", () => {
  afterAll(async () => {
    await prisma.rateLimit.deleteMany({
      where: {
        OR: [{ key: { contains: String(stamp) } }, ...users.map((id) => ({ key: { contains: id } }))]
      }
    });
    await prisma.pushDevice.deleteMany({ where: { token: ownerToken } });
    await prisma.adminNotifyPref.deleteMany({ where: { userId: { in: users } } });
    await prisma.adminDevice.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("sends to active admin devices, honours preferences, and drops dead tokens", async () => {
    const live = await prisma.user.create({
      data: { email: `push-live-${stamp}@example.test`, role: "ADMIN", name: "Live" }
    });
    const quiet = await prisma.user.create({
      data: { email: `push-quiet-${stamp}@example.test`, role: "ADMIN", name: "Quiet" }
    });
    const owner = await prisma.user.create({
      data: { email: `push-owner-${stamp}@example.test`, role: "USER", name: "Owner" }
    });
    users.push(live.id, quiet.id, owner.id);
    await prisma.adminDevice.create({
      data: { userId: live.id, name: "Live", platform: "android", status: "ACTIVE", pushToken: liveToken }
    });
    await prisma.adminDevice.create({
      data: { userId: live.id, name: "Dead", platform: "android", status: "ACTIVE", pushToken: deadToken }
    });
    await prisma.adminDevice.create({
      data: { userId: live.id, name: "Waiting", platform: "android", status: "PENDING", pushToken: pendingToken }
    });
    await prisma.adminDevice.create({
      data: { userId: quiet.id, name: "Quiet", platform: "android", status: "ACTIVE", pushToken: quietToken }
    });
    await prisma.adminNotifyPref.create({ data: { userId: quiet.id, signup: false } });
    await prisma.pushDevice.create({ data: { userId: owner.id, token: ownerToken, platform: "ANDROID" } });

    const seen: string[][] = [];
    const send = fetchImpl(seen);
    await queueAdminPush({
      event: "signup",
      collapseKey: `signup-${stamp}`,
      title: "New signup",
      body: "A new owner joined.",
      fetchImpl: send
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain(liveToken);
    expect(seen[0]).toContain(deadToken);
    expect(seen[0]).not.toContain(quietToken);
    expect(seen[0]).not.toContain(ownerToken);
    expect(seen[0]).not.toContain(pendingToken);

    await queueAdminPush({
      event: "signup",
      collapseKey: `signup-${stamp}`,
      title: "New signup",
      body: "Again",
      fetchImpl: send
    });
    expect(seen).toHaveLength(1);
    expect(await prisma.pushDevice.findUnique({ where: { token: ownerToken } })).toBeTruthy();
    expect((await prisma.adminDevice.findFirst({ where: { pushToken: deadToken } }))).toBeNull();
    expect((await prisma.adminDevice.findFirst({ where: { pushToken: liveToken } }))?.status).toBe("ACTIVE");

    await scanAdminPaymentAlerts(new Date(), send);
  });
});

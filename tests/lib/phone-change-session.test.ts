import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PUT as confirmPhone } from "../../app/api/v1/me/phone/route";
import { verifyAccessToken } from "../../lib/auth/access-token";
import { issueTokenPair, rotateRefreshToken } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";
import { hashToken } from "../../lib/tokens";

describe("phone change sessions", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.emailOtp.deleteMany({ where: { identifier: { contains: users[0] } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("revokes other refresh sessions and keeps the session making the request", async () => {
    const stamp = Date.now().toString(36);
    const user = await prisma.user.create({
      data: { email: `phone-${stamp}@example.test`, role: "USER", phone: "9811100001" }
    });
    users.push(user.id);
    const current = await issueTokenPair({ id: user.id, role: user.role }, { deviceName: "This phone" });
    const stolen = await issueTokenPair({ id: user.id, role: user.role }, { deviceName: "Other phone" });
    const currentRow = await prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(current.refreshToken) } });
    expect(verifyAccessToken(current.accessToken)?.sid).toBe(currentRow?.id);

    const phone = `9${String(Math.floor(100000000 + Math.random() * 899999999))}`;
    await prisma.emailOtp.create({
      data: {
        identifier: `phone:${user.id}:${phone}`,
        tokenHash: hashToken("123456"),
        channel: "phone",
        purpose: "phone-change",
        expires: new Date(Date.now() + 60_000)
      }
    });

    const res = await confirmPhone(
      new NextRequest("http://127.0.0.1/api/v1/me/phone", {
        method: "PUT",
        headers: { authorization: `Bearer ${current.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ phone, code: "123456" })
      })
    );
    expect(res.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.phone).toBe(phone);

    const kept = await rotateRefreshToken(current.refreshToken);
    expect(kept.ok).toBe(true);
    const dropped = await rotateRefreshToken(stolen.refreshToken);
    expect(dropped.ok).toBe(false);
    const stolenRow = await prisma.refreshSession.findUnique({ where: { tokenHash: hashToken(stolen.refreshToken) } });
    expect(stolenRow?.revokedAt).toBeTruthy();
  });
});

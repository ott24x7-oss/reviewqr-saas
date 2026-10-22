import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE as deleteMe } from "../../app/api/v1/me/route";
import { POST as deleteWithOtp } from "../../app/api/v1/me/deletion/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 account deletion", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.emailOtp.deleteMany({ where: { identifier: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, path: string, body?: unknown) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest(`http://127.0.0.1${path}`, {
      method: body ? "POST" : "DELETE",
      headers: {
        authorization: `Bearer ${pair.accessToken}`,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : JSON.stringify({ confirm: "DELETE" })
    });
  }

  it("rejects a deletion code request without a token", async () => {
    const res = await deleteWithOtp(
      new NextRequest("http://127.0.0.1/api/v1/me/deletion", {
        method: "POST",
        headers: { authorization: "Bearer not-a-token", "content-type": "application/json" },
        body: JSON.stringify({ action: "request" })
      })
    );
    expect(res.status).toBe(401);
  });

  it("keeps the typed DELETE confirmation", async () => {
    const user = await prisma.user.create({
      data: { email: `del-old-${Date.now()}@example.test`, role: "USER" }
    });
    users.push(user.id);
    const res = await deleteMe(await authed(user, "/api/v1/me"));
    expect(res.status).toBe(200);
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    expect(row?.deletedAt).toBeTruthy();
  });

  it("sends a code and anonymizes the account only after it matches", async () => {
    const previous = process.env.OTP_DEV_REVEAL;
    process.env.OTP_DEV_REVEAL = "1";
    const phone = `9${String(Date.now()).slice(-9)}`;
    const user = await prisma.user.create({
      data: { email: `del-otp-${Date.now()}@example.test`, role: "USER", phone }
    });
    users.push(user.id);
    try {
      const sent = await deleteWithOtp(await authed(user, "/api/v1/me/deletion", { action: "request" }));
      expect(sent.status).toBe(200);
      const body = await sent.json();
      expect(body.data.sent).toBe(true);
      expect(body.data.channel).toBeTruthy();
      expect(body.data.devCode).toMatch(/^\d{6}$/);
      const wrong = await deleteWithOtp(
        await authed(user, "/api/v1/me/deletion", { action: "confirm", code: "000000" })
      );
      expect(wrong.status).toBe(400);
      const ok = await deleteWithOtp(
        await authed(user, "/api/v1/me/deletion", { action: "confirm", code: body.data.devCode })
      );
      expect(ok.status).toBe(200);
      const row = await prisma.user.findUnique({ where: { id: user.id } });
      expect(row?.deletedAt).toBeTruthy();
      expect(row?.phone).toBeNull();
      expect(row?.email).toContain("deleted+");
    } finally {
      if (previous === undefined) delete process.env.OTP_DEV_REVEAL;
      else process.env.OTP_DEV_REVEAL = previous;
    }
  });

  it("hides the dev code when reveal is off", async () => {
    const previous = process.env.OTP_DEV_REVEAL;
    delete process.env.OTP_DEV_REVEAL;
    const phone = `8${String(Date.now()).slice(-9)}`;
    const user = await prisma.user.create({
      data: { email: `del-hide-${Date.now()}@example.test`, role: "USER", phone }
    });
    users.push(user.id);
    try {
      const sent = await deleteWithOtp(await authed(user, "/api/v1/me/deletion", { action: "request" }));
      expect(sent.status).toBe(200);
      const body = await sent.json();
      expect(body.data.devCode).toBeUndefined();
    } finally {
      if (previous === undefined) delete process.env.OTP_DEV_REVEAL;
      else process.env.OTP_DEV_REVEAL = previous;
    }
  });

  it("refuses an admin and a user with no mobile number", async () => {
    const admin = await prisma.user.create({
      data: { email: `del-admin-${Date.now()}@example.test`, role: "ADMIN", phone: "9111111111" }
    });
    const bare = await prisma.user.create({
      data: { email: `del-bare-${Date.now()}@example.test`, role: "USER" }
    });
    users.push(admin.id, bare.id);
    const adminRes = await deleteWithOtp(await authed(admin, "/api/v1/me/deletion", { action: "request" }));
    expect(adminRes.status).toBe(403);
    const bareRes = await deleteWithOtp(await authed(bare, "/api/v1/me/deletion", { action: "request" }));
    expect(bareRes.status).toBe(400);
  });
});

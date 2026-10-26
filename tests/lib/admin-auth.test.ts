import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as requestPost } from "../../app/api/v1/admin/auth/otp/request/route";
import { POST as verifyPost } from "../../app/api/v1/admin/auth/otp/verify/route";
import { POST as refreshPost } from "../../app/api/v1/admin/auth/refresh/route";
import { POST as ownerRefreshPost } from "../../app/api/v1/auth/refresh/route";
import { POST as logoutPost } from "../../app/api/v1/admin/auth/logout/route";
import { POST as stepPost } from "../../app/api/v1/admin/step-up/route";
import { GET as devicesGet } from "../../app/api/v1/admin/devices/route";
import { POST as devicePost } from "../../app/api/v1/admin/devices/[id]/route";
import { signAccessToken, STEP_UP_TTL_SEC } from "../../lib/auth/access-token";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

const reveal = process.env.OTP_DEV_REVEAL;
process.env.OTP_DEV_REVEAL = "1";

async function clearPhoneLimits(phone: string) {
  await prisma.rateLimit.deleteMany({
    where: {
      OR: ["otp-phone:", "otp-phone-15:", "otp-cooldown:"].map((prefix) => ({ key: `${prefix}${phone}` }))
    }
  });
}

function call(path: string, body?: unknown, token?: string, extra?: Record<string, string>) {
  return new NextRequest(`http://localhost${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "x-forwarded-for": "10.24.7.15",
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extra
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

describe("admin auth", () => {
  const users: string[] = [];
  const phones: string[] = [];
  const stamp = Date.now();
  const adminPhone = `9${String(stamp).slice(-9)}`;
  const otherPhone = `8${String(stamp).slice(-9)}`;
  const stranger = `7${String(stamp).slice(-9)}`;

  afterAll(async () => {
    if (reveal === undefined) delete process.env.OTP_DEV_REVEAL;
    else process.env.OTP_DEV_REVEAL = reveal;
    if (phones.length) await prisma.emailOtp.deleteMany({ where: { identifier: { in: [...phones, ...users] } } });
    if (users.length) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
      await prisma.rateLimit.deleteMany({
        where: { OR: [...users, ...phones].map((key) => ({ key: { contains: key } })) }
      });
      await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
      await prisma.adminDevice.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
  });

  it("does not reveal which numbers are admins", async () => {
    phones.push(adminPhone, otherPhone, stranger);
    const admin = await prisma.user.create({
      data: { email: `admin-auth-${stamp}@example.test`, role: "ADMIN", phone: adminPhone, name: "Admin" }
    });
    const owner = await prisma.user.create({
      data: { email: `owner-auth-${stamp}@example.test`, role: "USER", phone: otherPhone, name: "Owner" }
    });
    users.push(admin.id, owner.id);

    const adminRes = await requestPost(call("/api/v1/admin/auth/otp/request", { phone: adminPhone }));
    const strangerRes = await requestPost(call("/api/v1/admin/auth/otp/request", { phone: stranger }));
    expect(adminRes.status).toBe(200);
    expect(strangerRes.status).toBe(200);
    const adminBody = await adminRes.json();
    const strangerBody = await strangerRes.json();
    expect(adminBody.data.devCode).toMatch(/^\d{6}$/);
    expect(strangerBody.data.devCode).toBeUndefined();
    const { devCode: _ignored, ...adminPublic } = adminBody.data;
    expect(strangerBody.data).toEqual(adminPublic);

    const denied = await verifyPost(
      call("/api/v1/admin/auth/otp/verify", {
        phone: otherPhone,
        code: "000000",
        deviceName: "Owner phone"
      })
    );
    expect(denied.status).toBe(400);
    expect((await denied.json()).error.message).toBe("Invalid code");
  });

  it("issues an admin audience token and keeps a new phone pending", async () => {
    await clearPhoneLimits(adminPhone);
    const requested = await requestPost(call("/api/v1/admin/auth/otp/request", { phone: adminPhone }));
    const devCode = (await requested.json()).data.devCode as string;
    const verified = await verifyPost(
      call("/api/v1/admin/auth/otp/verify", {
        phone: adminPhone,
        code: devCode,
        deviceName: `Desk ${stamp}`,
        platform: "android"
      })
    );
    expect(verified.status).toBe(200);
    const session = (await verified.json()).data;
    expect(session.expiresIn).toBe(600);
    expect(session.device.status).toBe("PENDING");
    const payload = JSON.parse(Buffer.from(session.accessToken.split(".")[1], "base64url").toString("utf8"));
    expect(payload.aud).toBe("admin");
    expect(payload.deviceId).toBe(session.device.id);
    expect(payload.exp - payload.iat).toBe(600);

    const pending = await devicesGet(call("/api/v1/admin/devices", undefined, session.accessToken));
    expect(pending.status).toBe(403);
    expect((await pending.json()).error.code).toBe("DEVICE_PENDING");

    const refreshed = await refreshPost(call("/api/v1/admin/auth/refresh", { refreshToken: session.refreshToken }));
    expect(refreshed.status).toBe(200);
    const next = (await refreshed.json()).data;
    expect(next.device.status).toBe("PENDING");
    expect(next.expiresIn).toBe(600);
    const reused = await refreshPost(call("/api/v1/admin/auth/refresh", { refreshToken: session.refreshToken }));
    expect(reused.status).toBe(401);

    const admin = await prisma.user.findFirst({ where: { phone: adminPhone } });
    const owner = await prisma.user.findFirst({ where: { phone: otherPhone } });
    if (!admin || !owner) throw new Error("fixture missing");
    const ownerToken = await issueTokenPair(owner);
    const ownerCall = await devicesGet(call("/api/v1/admin/devices", undefined, ownerToken.accessToken));
    expect(ownerCall.status).toBe(403);
    expect((await ownerCall.json()).error.code).toBe("FORBIDDEN");

    const staleAdmin = await issueTokenPair(admin);
    const staleCall = await devicesGet(call("/api/v1/admin/devices", undefined, staleAdmin.accessToken));
    expect(staleCall.status).toBe(403);

    const ownerOnAdmin = await refreshPost(call("/api/v1/admin/auth/refresh", { refreshToken: ownerToken.refreshToken }));
    expect(ownerOnAdmin.status).toBe(401);
    const ownerLogout = await logoutPost(call("/api/v1/admin/auth/logout", { refreshToken: ownerToken.refreshToken }));
    expect(ownerLogout.status).toBe(401);
    const ownerStill = await ownerRefreshPost(call("/api/v1/auth/refresh", { refreshToken: ownerToken.refreshToken }));
    expect(ownerStill.status).toBe(200);
  });

  it("requires a fresh step-up to approve, then rejects a revoked phone", async () => {
    const approverPhone = `6${String(stamp).slice(-9)}`;
    phones.push(approverPhone);
    const approver = await prisma.user.create({
      data: { email: `approver-${stamp}@example.test`, role: "ADMIN", phone: approverPhone, name: "Approver" }
    });
    users.push(approver.id);
    const codeRes = await requestPost(call("/api/v1/admin/auth/otp/request", { phone: approverPhone }));
    const approverSession = await verifyPost(
      call("/api/v1/admin/auth/otp/verify", {
        phone: approverPhone,
        code: (await codeRes.json()).data.devCode,
        deviceName: `Approver ${stamp}`
      })
    );
    const approverBody = (await approverSession.json()).data;
    await prisma.adminDevice.update({ where: { id: approverBody.device.id }, data: { status: "ACTIVE" } });

    const admin = await prisma.user.findFirst({ where: { phone: adminPhone } });
    const pendingDevice = await prisma.adminDevice.findFirst({
      where: { userId: admin!.id, status: "PENDING" },
      orderBy: { createdAt: "desc" }
    });
    if (!pendingDevice) throw new Error("pending device missing");

    const missing = await devicePost(
      call(`/api/v1/admin/devices/${pendingDevice.id}`, { action: "approve" }, approverBody.accessToken),
      { params: { id: pendingDevice.id } }
    );
    expect(missing.status).toBe(403);
    expect((await missing.json()).error.code).toBe("STEP_UP_REQUIRED");

    const expired = signAccessToken(
      { sub: approver.id, role: "ADMIN", aud: "admin-step-up", deviceId: approverBody.device.id },
      Math.floor(Date.now() / 1000) - 600,
      undefined,
      STEP_UP_TTL_SEC
    );
    const expiredCall = await devicePost(
      call(`/api/v1/admin/devices/${pendingDevice.id}`, { action: "approve" }, approverBody.accessToken, {
        "x-step-up": expired
      }),
      { params: { id: pendingDevice.id } }
    );
    expect(expiredCall.status).toBe(403);
    expect((await expiredCall.json()).error.code).toBe("STEP_UP_REQUIRED");

    const mismatch = signAccessToken(
      { sub: approver.id, role: "ADMIN", aud: "admin-step-up", deviceId: pendingDevice.id },
      undefined,
      undefined,
      STEP_UP_TTL_SEC
    );
    const mismatchCall = await devicePost(
      call(`/api/v1/admin/devices/${pendingDevice.id}`, { action: "approve" }, approverBody.accessToken, {
        "x-step-up": mismatch
      }),
      { params: { id: pendingDevice.id } }
    );
    expect(mismatchCall.status).toBe(403);

    const sent = await stepPost(call("/api/v1/admin/step-up", {}, approverBody.accessToken));
    expect(sent.status).toBe(200);
    const stepCode = (await sent.json()).data.devCode as string;
    const confirmed = await stepPost(call("/api/v1/admin/step-up", { code: stepCode }, approverBody.accessToken));
    const confirmedBody = await confirmed.json();
    expect(confirmed.status).toBe(200);
    const stepUpToken = confirmedBody.data.stepUpToken as string;
    expect(confirmedBody.data.expiresIn).toBe(300);

    const confirmedAgain = await stepPost(call("/api/v1/admin/step-up", { code: stepCode }, approverBody.accessToken));
    expect((await confirmedAgain.json()).error.message).toBe("Invalid code");

    const approved = await devicePost(
      call(`/api/v1/admin/devices/${pendingDevice.id}`, { action: "approve" }, approverBody.accessToken, {
        "x-step-up": stepUpToken
      }),
      { params: { id: pendingDevice.id } }
    );
    expect(approved.status).toBe(200);
    const audit = await prisma.auditLog.findFirst({
      where: { action: "admin.device", entityId: pendingDevice.id, userId: approver.id }
    });
    expect(audit?.deviceId).toBe(approverBody.device.id);
    expect(audit?.after).toMatchObject({ status: "ACTIVE" });

    const adminAccess = await prisma.user.findFirst({ where: { phone: adminPhone } });
    const active = await prisma.adminDevice.findUnique({ where: { id: pendingDevice.id } });
    expect(active?.status).toBe("ACTIVE");
    const adminToken = signAccessToken(
      { sub: adminAccess!.id, role: "ADMIN", aud: "admin", deviceId: pendingDevice.id },
      undefined,
      undefined,
      600
    );
    const open = await devicesGet(call("/api/v1/admin/devices", undefined, adminToken));
    expect(open.status).toBe(200);

    const revoked = await devicePost(
      call(`/api/v1/admin/devices/${pendingDevice.id}`, { action: "revoke" }, approverBody.accessToken),
      { params: { id: pendingDevice.id } }
    );
    expect(revoked.status).toBe(200);
    const blocked = await devicesGet(call("/api/v1/admin/devices", undefined, adminToken));
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).error.code).toBe("DEVICE_REVOKED");

    await clearPhoneLimits(adminPhone);
    const freshCode = await requestPost(call("/api/v1/admin/auth/otp/request", { phone: adminPhone }));
    const signedAgain = await verifyPost(
      call("/api/v1/admin/auth/otp/verify", {
        phone: adminPhone,
        code: (await freshCode.json()).data.devCode,
        deviceName: `Desk ${stamp}`,
        deviceId: pendingDevice.id
      })
    );
    const again = (await signedAgain.json()).data;
    expect(again.device.id).not.toBe(pendingDevice.id);
    expect(again.device.status).toBe("PENDING");

    const loggedOut = await logoutPost(call("/api/v1/admin/auth/logout", { refreshToken: approverBody.refreshToken }));
    expect(loggedOut.status).toBe(200);
    const dead = await refreshPost(call("/api/v1/admin/auth/refresh", { refreshToken: approverBody.refreshToken }));
    expect(dead.status).toBe(401);
  });
});

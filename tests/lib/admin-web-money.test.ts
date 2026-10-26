import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string } } }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn(async () => session.current) }));
const notifyUser = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/plans/notify", () => ({ notifyUser }));

import { POST as paymentPost } from "../../app/api/admin/payments/[id]/route";
import { POST as payoutPost } from "../../app/api/admin/commissions/route";
import { PATCH as userPatch } from "../../app/api/admin/users/[id]/route";
import { WEB_STEP_COOKIE, WEB_STEP_DEVICE } from "../../lib/admin/web-step";
import { signAccessToken, STEP_UP_TTL_SEC } from "../../lib/auth/access-token";
import { encryptSecret } from "../../lib/crypto";
import { prisma } from "../../lib/db";

const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const users: string[] = [];
const paymentIds: string[] = [];
let adminId = "";
let ownerId = "";
let agentId = "";

function must<T>(value: T | undefined): T {
  if (!value) throw new Error("route returned nothing");
  return value;
}

/** A one-time web step-up cookie for one action, as /api/admin/step-up sets it. */
function stepCookie(action: string) {
  const token = signAccessToken(
    { sub: adminId, role: "ADMIN", aud: "admin-step-up", deviceId: WEB_STEP_DEVICE, act: action, jti: `${stamp}-${Math.random().toString(36).slice(2)}` },
    undefined,
    undefined,
    STEP_UP_TTL_SEC
  );
  return `${WEB_STEP_COOKIE}=${token}`;
}

function post(path: string, body: unknown, cookie?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body)
  });
}

describe("web admin money routes", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { email: `web-admin-${stamp}@example.test`, role: "ADMIN" } });
    const owner = await prisma.user.create({ data: { email: `web-owner-${stamp}@example.test`, role: "USER" } });
    const agent = await prisma.user.create({ data: { email: `web-agent-${stamp}@example.test`, role: "AGENT" } });
    adminId = admin.id;
    ownerId = owner.id;
    agentId = agent.id;
    users.push(admin.id, owner.id, agent.id);
    await prisma.agentProfile.create({
      data: { userId: agent.id, code: `WM${stamp}`.slice(0, 14).toUpperCase(), upiId: "agent@upi", pan: encryptSecret("ABCDE1234F") }
    });
    session.current = { user: { id: admin.id, role: "ADMIN" } };
  });

  afterAll(async () => {
    await prisma.stepUpUse.deleteMany({ where: { jti: { startsWith: stamp } } });
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("needs a reason to approve or refund a payment and audits before and after", async () => {
    const payment = await prisma.payment.create({
      data: { userId: ownerId, amount: 10000, status: "PENDING", tier: "STARTER", provider: "MANUAL" }
    });
    paymentIds.push(payment.id);
    const ctx = { params: { id: payment.id } };

    const noReason = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, { action: "approve" }), ctx));
    expect(noReason.status).toBe(400);
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))?.status).toBe("PENDING");

    const approved = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, { action: "approve", reason: "Cash received" }), ctx));
    expect(approved.status).toBe(200);
    const approveRow = await prisma.auditLog.findFirst({ where: { userId: adminId, action: "payment.approve", entityId: payment.id } });
    expect(approveRow).toMatchObject({ reason: "Cash received", before: { status: "PENDING" }, after: { status: "COMPLETED" } });

    const refundNoReason = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, { action: "refund", refundUtr: "REFUND1234" }), ctx));
    expect(refundNoReason.status).toBe(400);
    const refundBody = { action: "refund", refundUtr: "REFUND1234", reason: "Duplicate charge" };
    const noCode = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, refundBody), ctx));
    expect(noCode.status).toBe(403);
    expect(await noCode.json()).toMatchObject({ stepUp: "refund_payment" });
    const wrongAction = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, refundBody, stepCookie("mark_payout_paid")), ctx));
    expect(wrongAction.status).toBe(403);
    const cookie = stepCookie("refund_payment");
    const refunded = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, refundBody, cookie), ctx));
    expect(refunded.status).toBe(200);
    // The same code cannot be spent twice.
    const replay = must(await paymentPost(post(`/api/admin/payments/${payment.id}`, refundBody, cookie), ctx));
    expect(replay.status).toBe(403);
    const refundRow = await prisma.auditLog.findFirst({ where: { userId: adminId, action: "payment.refund", entityId: payment.id } });
    expect(refundRow).toMatchObject({ reason: "Duplicate charge", before: { status: "COMPLETED" }, after: { status: "REFUNDED" } });
  });

  it("needs a reason for a payout, refuses a backdated or future date, and audits the result", async () => {
    await prisma.shopCommission.create({
      data: { agentId, kind: "SALE", sourceId: `web-pay-${agentId}`, amountPaise: 4000, percent: 0, status: "APPROVED" }
    });
    const base = { agentId, utr: `WEBPAY${stamp}`.slice(0, 20) };

    expect(must(await payoutPost(post("/api/admin/commissions", base))).status).toBe(400);
    const lastYear = must(await payoutPost(post("/api/admin/commissions", { ...base, reason: "Weekly", paidAt: "2020-01-15" })));
    expect(lastYear.status).toBe(400);
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    expect(must(await payoutPost(post("/api/admin/commissions", { ...base, reason: "Weekly", paidAt: future }))).status).toBe(400);
    expect(await prisma.commissionPayout.count({ where: { agentId } })).toBe(0);

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    expect(must(await payoutPost(post("/api/admin/commissions", { ...base, reason: "Weekly", paidAt: today }))).status).toBe(403);
    const paid = must(await payoutPost(post("/api/admin/commissions", { ...base, reason: "Weekly", paidAt: today }, stepCookie("mark_payout_paid"))));
    expect(paid.status).toBe(200);
    const payout = await prisma.commissionPayout.findFirstOrThrow({ where: { agentId } });
    expect(payout.paidAt.getTime()).toBeLessThanOrEqual(Date.now());
    const row = await prisma.auditLog.findFirst({ where: { userId: adminId, action: "commission.pay", entityId: payout.id } });
    expect(row?.reason).toBe("Weekly");
    expect(row?.before).toMatchObject({ approvedPaise: 4000, approvedCount: 1 });
    expect(row?.after).toMatchObject({ payoutId: payout.id, grossPaise: 4000 });
  });

  it("needs a reason to change a role on the web user editor and audits before and after", async () => {
    const ctx = { params: { id: ownerId } };
    const patch = (body: unknown) =>
      new NextRequest(`http://localhost/api/admin/users/${ownerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
    expect(must(await userPatch(patch({ role: "ADMIN" }), ctx)).status).toBe(400);
    expect((await prisma.user.findUnique({ where: { id: ownerId } }))?.role).toBe("USER");
    expect(must(await userPatch(patch({ role: "ADMIN", reason: "New ops hire" }), ctx)).status).toBe(200);
    const row = await prisma.auditLog.findFirst({ where: { userId: adminId, action: "user.role.change", entityId: ownerId } });
    expect(row).toMatchObject({ reason: "New ops hire", before: { role: "USER" }, after: { role: "ADMIN" } });
    expect(must(await userPatch(patch({ role: "USER", reason: "Undo" }), ctx)).status).toBe(200);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { GET as dashboardGet } from "../../app/api/v1/admin/dashboard/route";
import { GET as inboxGet, POST as inboxPost } from "../../app/api/v1/admin/inbox/route";
import { GET as searchGet } from "../../app/api/v1/admin/search/route";
import { GET as userGet, POST as userPost } from "../../app/api/v1/admin/users/[id]/route";
import { GET as businessGet, POST as businessPost } from "../../app/api/v1/admin/businesses/[id]/route";
import { GET as paymentsGet } from "../../app/api/v1/admin/payments/route";
import { GET as paymentGet, POST as paymentPost } from "../../app/api/v1/admin/payments/[id]/route";
import { GET as commissionsGet, POST as commissionsPost } from "../../app/api/v1/admin/commissions/route";
import { GET as plansGet } from "../../app/api/v1/admin/plans/route";
import { PATCH as planPatch } from "../../app/api/v1/admin/plans/[id]/route";
import { GET as teamGet, POST as teamPost } from "../../app/api/v1/admin/agents/team/route";
import { GET as ordersGet } from "../../app/api/v1/admin/shop/orders/route";
import { GET as orderGet, POST as orderPost } from "../../app/api/v1/admin/shop/orders/[id]/route";
import { GET as supportGet } from "../../app/api/v1/admin/support/route";
import { GET as ticketGet, POST as ticketPost } from "../../app/api/v1/admin/support/[id]/route";
import { GET as whatsAppGet } from "../../app/api/v1/admin/whatsapp/route";
import { POST as reconnectPost } from "../../app/api/v1/admin/whatsapp/reconnect/route";
import { POST as whatsAppTestPost } from "../../app/api/v1/admin/whatsapp/test/route";
import { GET as settingsGet, PUT as settingsPut } from "../../app/api/v1/admin/settings/route";
import { GET as auditGet } from "../../app/api/v1/admin/audit/route";
import { GET as devicesGet } from "../../app/api/v1/admin/devices/route";
import { POST as devicePost } from "../../app/api/v1/admin/devices/[id]/route";
import { GET as meGet } from "../../app/api/v1/admin/me/route";
import { GET as mineGet } from "../../app/api/v1/admin/devices/mine/route";
import { GET as summaryGet } from "../../app/api/v1/admin/money/summary/route";
import { GET as payoutsGet } from "../../app/api/v1/admin/payouts/route";
import { GET as proofGet } from "../../app/api/shop-proof/route";
import { signAccessToken, STEP_UP_TTL_SEC } from "../../lib/auth/access-token";
import { issueAdminTokenPair, issueTokenPair } from "../../lib/auth/sessions";
import { encryptSecret } from "../../lib/crypto";
import { prisma } from "../../lib/db";
import { openApiDocument } from "../../lib/api/openapi";
import {
  adminMeSchema,
  adminMoneySummarySchema,
  adminMyDevicesSchema,
  adminPayoutsPageSchema,
  adminShopOrderDetailSchema,
  adminTeamResponseSchema,
  adminWhatsAppStatusSchema
} from "@reviewqr/shared";

const stamp = Date.now();
const phone = `98000${String(stamp).slice(-5)}`;
const users: string[] = [];
const paymentIds: string[] = [];
const orderIds: string[] = [];
let adminId = "";
let personId = "";
let ownerToken = "";
let adminToken = "";
let deviceId = "";
let businessId = "";
let planId = "";
let pendingPay = "";
let donePay = "";
let cursorPayA = "";
let agentId = "";
let profileId = "";
let orderId = "";
let ticketId = "";
let pendingDeviceId = "";
const proofBytes = Buffer.from("shop-proof-bytes");

function call(path: string, opts: { method?: string; body?: unknown; token?: string; step?: string } = {}) {
  const method = opts.method || (opts.body === undefined ? "GET" : "POST");
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "x-forwarded-for": "10.24.9.21",
      ...(opts.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.step ? { "x-step-up": opts.step } : {})
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
}

/** A fresh single-use step-up token for one action, as /step-up would issue it. */
function stepFor(act: string) {
  return signAccessToken(
    { sub: adminId, role: "ADMIN", aud: "admin-step-up", deviceId, act, jti: randomUUID() },
    undefined,
    undefined,
    STEP_UP_TTL_SEC
  );
}

async function auditRow(action: string, entityId?: string) {
  return prisma.auditLog.findFirst({
    where: { userId: adminId, action, ...(entityId ? { entityId } : {}) },
    orderBy: { createdAt: "desc" }
  });
}

describe("admin api", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { email: `admin-api-${stamp}@example.test`, role: "ADMIN", phone, name: "Api Admin" }
    });
    const person = await prisma.user.create({
      data: { email: `person-api-${stamp}@example.test`, role: "USER", phone: `98111${String(stamp).slice(-5)}`, name: `Zz${stamp}` }
    });
    const owner = await prisma.user.create({
      data: { email: `owner-api-${stamp}@example.test`, role: "USER", name: "Owner" }
    });
    const agent = await prisma.user.create({
      data: { email: `agent-api-${stamp}@example.test`, role: "AGENT", name: "Api Agent" }
    });
    adminId = admin.id;
    personId = person.id;
    agentId = agent.id;
    users.push(admin.id, person.id, owner.id, agent.id);

    const device = await prisma.adminDevice.create({
      data: { userId: admin.id, name: "Api phone", platform: "android", status: "ACTIVE" }
    });
    const pending = await prisma.adminDevice.create({
      data: { userId: admin.id, name: "Waiting phone", platform: "android", status: "PENDING" }
    });
    deviceId = device.id;
    pendingDeviceId = pending.id;
    const tokens = await issueAdminTokenPair(admin, device.id, { deviceName: "Api phone" });
    adminToken = tokens.accessToken;
    const ownerTokens = await issueTokenPair(owner, { deviceName: "owner" });
    ownerToken = ownerTokens.accessToken;

    const business = await prisma.business.create({
      data: { ownerId: person.id, name: `Shop ${stamp}`, slug: `shop-${stamp}`, phone: "9811100099" }
    });
    businessId = business.id;
    const plan = await prisma.plan.create({
      data: {
        nameEn: `Admin ${stamp}`,
        nameHi: `Admin ${stamp}`,
        slug: `admin-${stamp}`,
        modules: ["REVIEWS"],
        limits: {},
        legacyTier: "STARTER",
        prices: { create: { duration: "MONTH_1", pricePaise: 10000, active: true } }
      }
    });
    planId = plan.id;
    const makePay = (status: "PENDING" | "COMPLETED", amount: number) =>
      prisma.payment.create({
        data: { userId: person.id, amount, status, tier: "STARTER", provider: "MANUAL", planId: plan.id }
      });
    const a = await makePay("COMPLETED", 1100);
    const b = await makePay("COMPLETED", 1200);
    const pendingPayment = await makePay("PENDING", 1300);
    const done = await makePay("COMPLETED", 1400);
    cursorPayA = a.id;
    pendingPay = pendingPayment.id;
    donePay = done.id;
    paymentIds.push(a.id, b.id, pendingPayment.id, done.id);

    const profile = await prisma.agentProfile.create({
      data: { userId: agent.id, code: `AG${String(stamp).slice(-8)}`, status: "PENDING", active: false, upiId: "agent@upi", pan: encryptSecret("ABCDE1234F") }
    });
    profileId = profile.id;
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "SALE",
        sourceId: `src-${stamp}`,
        amountPaise: 10000,
        percent: 10,
        status: "PENDING",
        holdUntil: new Date(Date.now() - 60_000)
      }
    });
    const order = await prisma.shopOrder.create({
      data: {
        userId: person.id,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalPaise: 100,
        discountPaise: 0,
        totalPaise: 100,
        taxablePaise: 100,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        advancePaise: 100,
        balancePaise: 0
      }
    });
    orderId = order.id;
    orderIds.push(order.id);
    await prisma.shopOrderLine.create({
      data: {
        orderId: order.id,
        sku: "STAND",
        name: "Acrylic stand",
        qty: 2,
        unitPaise: 50,
        hsn: "4911",
        gstPercent: 0,
        discountPaise: 0,
        netPaise: 100,
        taxablePaise: 100,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        ships: true,
        needsDesign: false,
        needsNfc: false,
        weightGrams: 200,
        proofUrl: `data:image/png;base64,${proofBytes.toString("base64")}`
      }
    });
    const ticket = await prisma.supportTicket.create({
      data: { userId: person.id, subject: `Help ${stamp}`, status: "OPEN" }
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await prisma.shopShipment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.shopOrderLine.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.shopOrder.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.supportTicket.deleteMany({ where: { userId: { in: users } } });
    await prisma.notification.deleteMany({ where: { userId: { in: users } } });
    await prisma.business.deleteMany({ where: { id: businessId || undefined } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.adminNotifyPref.deleteMany({ where: { userId: { in: users } } });
    await prisma.rateLimit.deleteMany({ where: { OR: users.map((id) => ({ key: { contains: id } })) } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.adminDevice.deleteMany({ where: { userId: { in: users } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    if (planId) await prisma.plan.deleteMany({ where: { id: planId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("rejects owner tokens on every admin route", async () => {
    const gets: Array<[string, (req: NextRequest, ctx?: { params: Record<string, string> }) => Promise<Response>]> = [
      ["/api/v1/admin/dashboard", dashboardGet],
      ["/api/v1/admin/inbox", inboxGet],
      ["/api/v1/admin/search?q=ab", searchGet],
      [`/api/v1/admin/users/${personId}`, userGet],
      [`/api/v1/admin/businesses/${businessId}`, businessGet],
      ["/api/v1/admin/payments", paymentsGet],
      [`/api/v1/admin/payments/${donePay}`, paymentGet],
      ["/api/v1/admin/commissions", commissionsGet],
      ["/api/v1/admin/plans", plansGet],
      ["/api/v1/admin/agents/team", teamGet],
      ["/api/v1/admin/shop/orders", ordersGet],
      [`/api/v1/admin/shop/orders/${orderId}`, orderGet],
      ["/api/v1/admin/support", supportGet],
      [`/api/v1/admin/support/${ticketId}`, ticketGet],
      ["/api/v1/admin/whatsapp", whatsAppGet],
      ["/api/v1/admin/settings", settingsGet],
      ["/api/v1/admin/audit", auditGet],
      ["/api/v1/admin/devices", devicesGet],
      ["/api/v1/admin/me", meGet],
      ["/api/v1/admin/devices/mine", mineGet],
      ["/api/v1/admin/money/summary?range=30d", summaryGet],
      ["/api/v1/admin/payouts", payoutsGet]
    ];
    for (const [path, handler] of gets) {
      const res = await handler(call(path, { token: ownerToken }), { params: { id: personId } });
      expect(res.status, path).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    }
    const posted = await paymentPost(call(`/api/v1/admin/payments/${donePay}`, { token: ownerToken, body: { action: "reject" } }), {
      params: { id: donePay }
    });
    expect(posted.status).toBe(403);
  });

  it("blocks a pending device and serves the dashboard", async () => {
    const pendingToken = signAccessToken(
      { sub: adminId, role: "ADMIN", aud: "admin", deviceId: pendingDeviceId },
      undefined,
      undefined,
      600
    );
    const blocked = await dashboardGet(call("/api/v1/admin/dashboard", { token: pendingToken }));
    expect(blocked.status).toBe(403);
    expect((await blocked.json()).error.code).toBe("DEVICE_PENDING");

    const bad = await dashboardGet(call("/api/v1/admin/dashboard?range=nope", { token: adminToken }));
    expect(bad.status).toBe(400);
    const okRes = await dashboardGet(call("/api/v1/admin/dashboard?range=7d", { token: adminToken }));
    expect(okRes.status).toBe(200);
    const body = await okRes.json();
    expect(typeof body.data.kpis.revenuePaise).toBe("number");
    expect(Array.isArray(body.data.series.days)).toBe(true);
    expect(body.data.health.whatsapp).toBeTruthy();
    expect(Array.isArray(body.data.planMix)).toBe(true);
    expect(body.data.leaderboard.rows).toBeTruthy();
  });

  it("masks phones in search and user detail", async () => {
    const short = await searchGet(call("/api/v1/admin/search?q=a", { token: adminToken }));
    expect(short.status).toBe(400);
    const found = await searchGet(call(`/api/v1/admin/search?q=Zz${stamp}`, { token: adminToken }));
    expect(found.status).toBe(200);
    const body = await found.json();
    const row = body.data.users.find((item: { id: string }) => item.id === personId);
    expect(row.phone.startsWith("••••")).toBe(true);
    expect(row.phone).not.toContain("98111");
    const detail = await userGet(call(`/api/v1/admin/users/${personId}`, { token: adminToken }), { params: { id: personId } });
    expect(detail.status).toBe(200);
    const userBody = await detail.json();
    expect(userBody.data.phone.startsWith("••••")).toBe(true);
    expect(userBody.data.email).toContain("@");
  });

  it("writes an audit row for user actions and requires step-up for role and long grants", async () => {
    const note = await userPost(call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "note", note: "Called the owner" } }), {
      params: { id: personId }
    });
    expect(note.status).toBe(200);
    const noted = await auditRow("user.note", personId);
    expect(noted?.deviceId).toBe(deviceId);
    expect(noted?.reason).toBe("Called the owner");

    const longGrantNoReason = await userPost(call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "grant", days: 31 } }), {
      params: { id: personId }
    });
    expect(longGrantNoReason.status).toBe(400);
    const longGrant = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "grant", days: 31, reason: "Goodwill" } }),
      { params: { id: personId } }
    );
    expect(longGrant.status).toBe(403);
    expect((await longGrant.json()).error.code).toBe("STEP_UP_REQUIRED");

    const grant = await userPost(call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "grant", days: 2 } }), {
      params: { id: personId }
    });
    expect(grant.status).toBe(200);
    expect((await auditRow("user.subscription.extend", personId))?.deviceId).toBe(deviceId);

    const role = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "role", role: "STAFF" } }),
      { params: { id: personId } }
    );
    expect(role.status).toBe(403);
    const wrongAction = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, step: stepFor("mark_payout_paid"), body: { action: "role", role: "STAFF" } }),
      { params: { id: personId } }
    );
    expect(wrongAction.status).toBe(403);
    expect((await prisma.user.findUnique({ where: { id: personId } }))?.role).toBe("USER");
    const roleStep = stepFor("change_role");
    const roleOk = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, step: roleStep, body: { action: "role", role: "STAFF" } }),
      { params: { id: personId } }
    );
    const replayed = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, step: roleStep, body: { action: "role", role: "USER" } }),
      { params: { id: personId } }
    );
    expect(replayed.status).toBe(403);
    expect((await replayed.json()).error.code).toBe("STEP_UP_REQUIRED");
    expect(roleOk.status).toBe(200);
    expect((await auditRow("user.role.change", personId))?.deviceId).toBe(deviceId);

    const plan = await userPost(
      call(`/api/v1/admin/users/${personId}`, { token: adminToken, body: { action: "plan", planId, duration: "MONTH_1" } }),
      { params: { id: personId } }
    );
    expect(plan.status).toBe(200);
    expect((await auditRow("user.tier.change", personId))?.deviceId).toBe(deviceId);
  });

  it("needs a reason and a plan step-up for a lifetime or yearly plan change", async () => {
    const lifetime = await prisma.plan.create({
      data: {
        nameEn: `Life ${stamp}`,
        nameHi: `Life ${stamp}`,
        slug: `life-${stamp}`,
        modules: ["REVIEWS"],
        limits: {},
        legacyTier: "STARTER",
        prices: { create: { duration: "LIFETIME", pricePaise: 90000, active: true } }
      }
    });
    try {
      // No duration: the server picks the only price, LIFETIME, and still asks for step-up.
      const post = (body: Record<string, unknown>, stepToken?: string) =>
        userPost(call(`/api/v1/admin/users/${personId}`, { token: adminToken, step: stepToken, body }), { params: { id: personId } });
      expect((await post({ action: "plan", planId: lifetime.id })).status).toBe(400);
      const noStep = await post({ action: "plan", planId: lifetime.id, reason: "Partner deal" });
      expect(noStep.status).toBe(403);
      expect((await post({ action: "plan", planId: lifetime.id, reason: "Partner deal" }, stepFor("grant_days_over_30"))).status).toBe(403);
      expect(await prisma.subscription.count({ where: { userId: personId, planId: lifetime.id } })).toBe(0);
      const done = await post({ action: "plan", planId: lifetime.id, duration: "LIFETIME", reason: "Partner deal" }, stepFor("change_user_plan"));
      expect(done.status).toBe(200);
      const row = await auditRow("user.tier.change", personId);
      expect(row?.reason).toBe("Partner deal");
      expect(row?.before).toBeTruthy();
      expect(row?.after).toMatchObject({ planId: lifetime.id, duration: "LIFETIME" });
    } finally {
      await prisma.subscription.deleteMany({ where: { planId: lifetime.id } });
      await prisma.planPrice.deleteMany({ where: { planId: lifetime.id } });
      await prisma.plan.delete({ where: { id: lifetime.id } }).catch(() => undefined);
    }
  });

  it("suspends a business and reveals the phone in the audit", async () => {
    const view = await businessGet(call(`/api/v1/admin/businesses/${businessId}`, { token: adminToken }), { params: { id: businessId } });
    expect(view.status).toBe(200);
    expect((await view.json()).data.phone.startsWith("••••")).toBe(true);
    const suspended = await businessPost(
      call(`/api/v1/admin/businesses/${businessId}`, { token: adminToken, body: { action: "suspend" } }),
      { params: { id: businessId } }
    );
    expect(suspended.status).toBe(200);
    expect((await auditRow("business.suspend", businessId))?.deviceId).toBe(deviceId);
    const row = await prisma.business.findUnique({ where: { id: businessId } });
    expect(row?.isActive).toBe(false);
    const reveal = await businessPost(
      call(`/api/v1/admin/businesses/${businessId}`, { token: adminToken, body: { action: "reveal" } }),
      { params: { id: businessId } }
    );
    expect(reveal.status).toBe(200);
    expect((await reveal.json()).data.phone).toBe("9811100099");
    expect((await auditRow("business.reveal", businessId))?.deviceId).toBe(deviceId);
  });

  it("needs a reason and a step-up to approve a manual payment", async () => {
    const manual = await prisma.payment.create({
      data: { userId: personId, amount: 10000, status: "PENDING", tier: "STARTER", provider: "MANUAL", planId }
    });
    paymentIds.push(manual.id);
    const post = (body: Record<string, unknown>, stepToken?: string) =>
      paymentPost(call(`/api/v1/admin/payments/${manual.id}`, { token: adminToken, step: stepToken, body }), { params: { id: manual.id } });
    expect((await post({ action: "approve" })).status).toBe(400);
    expect((await post({ action: "approve", reason: "Bank transfer seen" })).status).toBe(403);
    expect((await post({ action: "approve", reason: "Bank transfer seen" }, stepFor("refund_payment"))).status).toBe(403);
    expect((await prisma.payment.findUnique({ where: { id: manual.id } }))?.status).toBe("PENDING");
    const approved = await post({ action: "approve", reason: "Bank transfer seen" }, stepFor("approve_payment"));
    expect(approved.status).toBe(200);
    expect((await prisma.payment.findUnique({ where: { id: manual.id } }))?.status).toBe("COMPLETED");
    const row = await auditRow("payment.approve", manual.id);
    expect(row?.reason).toBe("Bank transfer seen");
    expect(row?.after).toMatchObject({ status: "COMPLETED" });
  });

  it("pages payments and audits reject and refund", async () => {
    const page = await paymentsGet(call(`/api/v1/admin/payments?planId=${planId}&limit=1`, { token: adminToken }));
    expect(page.status).toBe(200);
    const first = await page.json();
    expect(first.data.items).toHaveLength(1);
    expect(first.data.items[0].phone.startsWith("••••")).toBe(true);
    expect(first.data.nextCursor).toBeTruthy();
    const next = await paymentsGet(
      call(`/api/v1/admin/payments?planId=${planId}&limit=1&cursor=${first.data.nextCursor}`, { token: adminToken })
    );
    expect(next.status).toBe(200);
    expect((await next.json()).data.items[0].id).not.toBe(first.data.items[0].id);

    const detail = await paymentGet(call(`/api/v1/admin/payments/${donePay}`, { token: adminToken }), { params: { id: donePay } });
    expect(detail.status).toBe(200);

    const rejected = await paymentPost(
      call(`/api/v1/admin/payments/${pendingPay}`, { token: adminToken, body: { action: "reject" } }),
      { params: { id: pendingPay } }
    );
    expect(rejected.status).toBe(200);
    expect((await auditRow("payment.reject", pendingPay))?.deviceId).toBe(deviceId);

    const noReason = await paymentPost(
      call(`/api/v1/admin/payments/${donePay}`, { token: adminToken, step: stepFor("refund_payment"), body: { action: "refund", refundUtr: "UTR123456" } }),
      { params: { id: donePay } }
    );
    expect(noReason.status).toBe(400);
    const noStep = await paymentPost(
      call(`/api/v1/admin/payments/${donePay}`, { token: adminToken, body: { action: "refund", refundUtr: "UTR123456", reason: "Customer returned it" } }),
      { params: { id: donePay } }
    );
    expect(noStep.status).toBe(403);
    expect((await prisma.payment.findUnique({ where: { id: donePay } }))?.status).toBe("COMPLETED");

    const refunded = await paymentPost(
      call(`/api/v1/admin/payments/${donePay}`, {
        token: adminToken,
        step: stepFor("refund_payment"),
        body: { action: "refund", refundUtr: "UTR123456", reason: "Customer returned it" }
      }),
      { params: { id: donePay } }
    );
    expect(refunded.status).toBe(200);
    const row = await auditRow("payment.refund", donePay);
    expect(row?.deviceId).toBe(deviceId);
    expect(row?.reason).toBe("Customer returned it");
    expect((await prisma.payment.findUnique({ where: { id: donePay } }))?.status).toBe("REFUNDED");
    expect(cursorPayA).toBeTruthy();
  });

  it("approves and pays one agent's commissions", async () => {
    const list = await commissionsGet(call("/api/v1/admin/commissions?status=PENDING", { token: adminToken }));
    expect(list.status).toBe(200);
    const approved = await commissionsPost(
      call("/api/v1/admin/commissions", { token: adminToken, body: { action: "approve", agentId } })
    );
    expect(approved.status).toBe(200);
    expect((await auditRow("commission.approve", agentId))?.deviceId).toBe(deviceId);
    const blocked = await commissionsPost(
      call("/api/v1/admin/commissions", { token: adminToken, body: { action: "pay", agentId, utr: "PAY123456", reason: "Weekly payout" } })
    );
    expect(blocked.status).toBe(403);
    const missing = await commissionsPost(
      call("/api/v1/admin/commissions", { token: adminToken, step: stepFor("mark_payout_paid"), body: { action: "pay", agentId, utr: "PAY123456" } })
    );
    expect(missing.status).toBe(400);
    const paid = await commissionsPost(
      call("/api/v1/admin/commissions", {
        token: adminToken,
        step: stepFor("mark_payout_paid"),
        body: { action: "pay", agentId, utr: "PAY123456", reason: "Weekly payout" }
      })
    );
    expect(paid.status).toBe(200);
    const body = await paid.json();
    expect(body.data.after.tdsPaise).toEqual(expect.any(Number));
    expect(body.data.after.netPaise).toBeLessThanOrEqual(body.data.after.grossPaise);
    const row = await auditRow("commission.pay", agentId);
    expect(row?.reason).toBe("Weekly payout");
    expect(row?.deviceId).toBe(deviceId);
  });

  it("edits a plan and requires step-up for a price change", async () => {
    const list = await plansGet(call("/api/v1/admin/plans", { token: adminToken }));
    expect(list.status).toBe(200);
    const toggled = await planPatch(
      call(`/api/v1/admin/plans/${planId}`, { method: "PATCH", token: adminToken, body: { active: false } }),
      { params: { id: planId } }
    );
    expect(toggled.status).toBe(200);
    expect((await auditRow("plan.update", planId))?.deviceId).toBe(deviceId);
    expect((await prisma.plan.findUnique({ where: { id: planId } }))?.active).toBe(false);

    const price = await planPatch(
      call(`/api/v1/admin/plans/${planId}`, { method: "PATCH", token: adminToken, body: { duration: "MONTH_1", pricePaise: 25000 } }),
      { params: { id: planId } }
    );
    expect(price.status).toBe(403);
    const still = await prisma.planPrice.findUnique({ where: { planId_duration: { planId, duration: "MONTH_1" } } });
    expect(still?.pricePaise).toBe(10000);
    const changed = await planPatch(
      call(`/api/v1/admin/plans/${planId}`, { method: "PATCH", token: adminToken, step: stepFor("change_plan_price"), body: { duration: "MONTH_1", pricePaise: 25000 } }),
      { params: { id: planId } }
    );
    expect(changed.status).toBe(200);
    expect((await prisma.planPrice.findUnique({ where: { planId_duration: { planId, duration: "MONTH_1" } } }))?.pricePaise).toBe(25000);
  });

  it("approves an agent from the team and the inbox", async () => {
    const team = await teamGet(call("/api/v1/admin/agents/team", { token: adminToken }));
    expect(team.status).toBe(200);
    const agents = (await team.json()).data.agents as Array<{ id: string; phone: string }>;
    const ours = agents.find((row) => row.id === profileId);
    expect(ours?.phone === "" || ours?.phone.startsWith("••••")).toBe(true);

    const inbox = await inboxGet(call("/api/v1/admin/inbox?segment=agents", { token: adminToken }));
    expect(inbox.status).toBe(200);
    expect((await inbox.json()).data.counts.agents).toBeGreaterThan(0);
    const acted = await inboxPost(
      call("/api/v1/admin/inbox", { token: adminToken, body: { segment: "agents", action: "approve", id: profileId } })
    );
    expect(acted.status).toBe(200);
    expect((await auditRow("inbox.action", profileId))?.deviceId).toBe(deviceId);
    expect((await prisma.agentProfile.findUnique({ where: { id: profileId } }))?.status).toBe("ACTIVE");

    const paused = await teamPost(
      call("/api/v1/admin/agents/team", { token: adminToken, body: { action: "pause", id: profileId } })
    );
    expect(paused.status).toBe(200);
    expect((await auditRow("agent.update", profileId))?.deviceId).toBe(deviceId);

    const waiting = await inboxPost(
      call("/api/v1/admin/inbox", { token: adminToken, body: { segment: "devices", action: "approve", id: pendingDeviceId } })
    );
    expect(waiting.status).toBe(403);
    expect((await prisma.adminDevice.findUnique({ where: { id: pendingDeviceId } }))?.status).toBe("PENDING");
  });

  it("moves a shop order one legal step and saves tracking without skipping statuses", async () => {
    const list = await ordersGet(call("/api/v1/admin/shop/orders?status=PAID", { token: adminToken }));
    expect(list.status).toBe(200);
    const moved = await orderPost(
      call(`/api/v1/admin/shop/orders/${orderId}`, { token: adminToken, body: { action: "move", to: "PROOF_SENT" } }),
      { params: { id: orderId } }
    );
    expect(moved.status).toBe(200);
    const moveAudit = await auditRow("shop.order.move", orderId);
    expect(moveAudit?.deviceId).toBe(deviceId);
    const skip = await orderPost(
      call(`/api/v1/admin/shop/orders/${orderId}`, { token: adminToken, body: { action: "tracking", awb: "AWB12345", courierName: "Manual" } }),
      { params: { id: orderId } }
    );
    expect(skip.status).toBe(200);
    expect((await skip.json()).data.moved).toBe(false);
    expect((await prisma.shopOrder.findUnique({ where: { id: orderId } }))?.status).toBe("PROOF_SENT");
    expect((await auditRow("shop.order.track", orderId))?.deviceId).toBe(deviceId);
    const proof = await orderPost(
      call(`/api/v1/admin/shop/orders/${orderId}`, { token: adminToken, body: { action: "approve-proof" } }),
      { params: { id: orderId } }
    );
    expect(proof.status).toBe(200);
    const detail = await orderGet(call(`/api/v1/admin/shop/orders/${orderId}`, { token: adminToken }), { params: { id: orderId } });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.data.status).toBe("APPROVED");
    expect(body.data.phone.startsWith("••••") || body.data.phone === "").toBe(true);
    expect(body.data.shipment.awb).toBe("AWB12345");
  });

  it("replies to a support ticket", async () => {
    const list = await supportGet(call("/api/v1/admin/support?status=OPEN", { token: adminToken }));
    expect(list.status).toBe(200);
    const reply = await ticketPost(
      call(`/api/v1/admin/support/${ticketId}`, { token: adminToken, body: { body: "We are on it", status: "CLOSED" } }),
      { params: { id: ticketId } }
    );
    expect(reply.status).toBe(200);
    expect((await auditRow("support.reply", ticketId))?.deviceId).toBe(deviceId);
    const detail = await ticketGet(call(`/api/v1/admin/support/${ticketId}`, { token: adminToken }), { params: { id: ticketId } });
    const detailBody = await detail.json();
    expect(detailBody.data.status).toBe("CLOSED");
    expect(detailBody.data.user.phone.startsWith("••••")).toBe(true);
  });

  it("requires step-up to reconnect WhatsApp and saves notification preferences", async () => {
    const status = await whatsAppGet(call("/api/v1/admin/whatsapp", { token: adminToken }));
    expect(status.status).toBe(200);
    expect((await status.json()).data.status).toBeTruthy();
    const reconnect = await reconnectPost(call("/api/v1/admin/whatsapp/reconnect", { token: adminToken, body: {} }));
    expect(reconnect.status).toBe(403);
    const sent = await whatsAppTestPost(
      call("/api/v1/admin/whatsapp/test", { token: adminToken, body: { message: "admin test" } })
    );
    expect(sent.status).toBe(200);
    expect((await sent.json()).data.to.startsWith("••••")).toBe(true);
    expect((await auditRow("settings.whatsapp.update", adminId))?.deviceId).toBe(deviceId);

    const blocked = await settingsPut(
      call("/api/v1/admin/settings", { method: "PUT", token: adminToken, body: { tdsPercent: 5 } })
    );
    expect(blocked.status).toBe(403);
    const saved = await settingsPut(
      call("/api/v1/admin/settings", { method: "PUT", token: adminToken, body: { notify: { signup: false } } })
    );
    expect(saved.status).toBe(200);
    expect((await auditRow("settings.admin", adminId))?.deviceId).toBe(deviceId);
    const view = await settingsGet(call("/api/v1/admin/settings", { token: adminToken }));
    expect((await view.json()).data.notify.signup).toBe(false);
    const cloudBody = await whatsAppGet(call("/api/v1/admin/whatsapp", { token: adminToken }));
    const cloud = await cloudBody.json();
    expect(adminWhatsAppStatusSchema.safeParse(cloud.data).success).toBe(true);
    expect(cloud.data.cloud.configured).toEqual(expect.any(Boolean));
    expect(Array.isArray(cloud.data.cloud.templates)).toBe(true);
    const raw = JSON.stringify(cloud);
    expect(raw).not.toContain("apiToken");
    expect(raw).not.toContain("Bearer ");
    if (cloud.data.cloud.configured) {
      for (const template of cloud.data.cloud.templates) {
        expect(template.name).toEqual(expect.any(String));
        expect(template.language).toEqual(expect.any(String));
        expect(template.status).toEqual(expect.any(String));
      }
    } else {
      expect(cloud.data.cloud.templates).toEqual([]);
    }
  });

  it("returns the signed-in admin and only their devices", async () => {
    const anon = await meGet(call("/api/v1/admin/me"));
    expect(anon.status).toBe(401);
    const pendingToken = signAccessToken(
      { sub: adminId, role: "ADMIN", aud: "admin", deviceId: pendingDeviceId },
      undefined,
      undefined,
      600
    );
    const pending = await meGet(call("/api/v1/admin/me", { token: pendingToken }));
    expect(pending.status).toBe(403);
    expect((await pending.json()).error.code).toBe("DEVICE_PENDING");

    const me = await meGet(call("/api/v1/admin/me", { token: adminToken }));
    expect(me.status).toBe(200);
    const profile = await me.json();
    expect(adminMeSchema.safeParse(profile.data).success).toBe(true);
    expect(profile.data.name).toBe("Api Admin");
    expect(profile.data.phoneMasked).toBe(`••••${phone.slice(-4)}`);
    expect(profile.data.device).toEqual({ name: "Api phone", status: "ACTIVE" });
    const profileRaw = JSON.stringify(profile);
    expect(profileRaw).not.toContain(phone);
    expect(profileRaw).not.toContain(`admin-api-${stamp}@example.test`);

    const other = await prisma.user.create({
      data: { email: `other-admin-${stamp}@example.test`, role: "ADMIN", name: "Other Admin", phone: "9000011111" }
    });
    users.push(other.id);
    const foreign = await prisma.adminDevice.create({
      data: { userId: other.id, name: "Foreign phone", platform: "ios", status: "ACTIVE" }
    });
    const spare = await prisma.adminDevice.create({
      data: { userId: adminId, name: "Spare phone", platform: "android", status: "ACTIVE" }
    });
    const mine = await mineGet(call("/api/v1/admin/devices/mine", { token: adminToken }));
    expect(mine.status).toBe(200);
    const listed = await mine.json();
    expect(adminMyDevicesSchema.safeParse(listed.data).success).toBe(true);
    const ids = listed.data.devices.map((row: { id: string }) => row.id);
    expect(ids).toContain(deviceId);
    expect(ids).toContain(spare.id);
    expect(ids).not.toContain(foreign.id);
    expect(listed.data.devices.find((row: { id: string }) => row.id === deviceId).current).toBe(true);
    expect(JSON.stringify(listed)).not.toContain("Other Admin");
    expect(JSON.stringify(listed)).not.toContain("9000011111");
    expect(JSON.stringify(listed)).not.toContain(`other-admin-${stamp}@example.test`);

    const revoked = await devicePost(
      call(`/api/v1/admin/devices/${spare.id}`, { token: adminToken, body: { action: "revoke" } }),
      { params: { id: spare.id } }
    );
    expect(revoked.status).toBe(200);
    const after = await mineGet(call("/api/v1/admin/devices/mine", { token: adminToken }));
    const afterBody = await after.json();
    expect(afterBody.data.devices.find((row: { id: string }) => row.id === spare.id).status).toBe("REVOKED");
    expect((await prisma.adminDevice.findUnique({ where: { id: deviceId } }))?.status).toBe("ACTIVE");
  });

  it("summarises money from the database and pages payout history", async () => {
    const denied = await summaryGet(call("/api/v1/admin/money/summary"));
    expect(denied.status).toBe(401);
    const badRange = await summaryGet(call("/api/v1/admin/money/summary?range=nope", { token: adminToken }));
    expect(badRange.status).toBe(400);
    const badCustom = await summaryGet(call("/api/v1/admin/money/summary?range=custom", { token: adminToken }));
    expect(badCustom.status).toBe(400);

    const beforeRes = await summaryGet(call("/api/v1/admin/money/summary?range=today", { token: adminToken }));
    expect(beforeRes.status).toBe(200);
    const before = (await beforeRes.json()).data;
    expect(adminMoneySummarySchema.safeParse(before).success).toBe(true);

    const collected = await prisma.payment.create({
      data: { userId: personId, amount: 888, status: "COMPLETED", tier: "STARTER", provider: "MANUAL", planId }
    });
    const refunded = await prisma.payment.create({
      data: { userId: personId, amount: 777, status: "REFUNDED", tier: "STARTER", provider: "MANUAL", planId }
    });
    paymentIds.push(collected.id, refunded.id);
    await prisma.shopCommission.create({
      data: { agentId, kind: "SALE", sourceId: `pend-${stamp}`, amountPaise: 321, percent: 10, status: "PENDING" }
    });
    await prisma.shopCommission.create({
      data: { agentId, kind: "SALE", sourceId: `appr-${stamp}`, amountPaise: 555, percent: 10, status: "APPROVED" }
    });
    const note = `secret-note-${stamp}`;
    await prisma.commissionPayout.create({
      data: {
        agentId,
        amountPaise: 377,
        grossPaise: 377,
        tdsPaise: 44,
        netPaise: 333,
        utr: `UTR${String(stamp).slice(-8)}`,
        paidAt: new Date(),
        note
      }
    });

    const afterRes = await summaryGet(call("/api/v1/admin/money/summary?range=today", { token: adminToken }));
    const after = (await afterRes.json()).data;
    expect(after.collectedPaise - before.collectedPaise).toBe(888);
    expect(after.refundsPaise - before.refundsPaise).toBe(777);
    expect(after.pendingCommissionsPaise - before.pendingCommissionsPaise).toBe(321);
    expect(after.approvedUnpaidPaise - before.approvedUnpaidPaise).toBe(555);
    expect(after.paidThisFyPaise - before.paidThisFyPaise).toBe(333);
    expect(after.tdsThisFyPaise - before.tdsThisFyPaise).toBe(44);

    const page = await payoutsGet(call("/api/v1/admin/payouts?limit=20", { token: adminToken }));
    expect(page.status).toBe(200);
    const history = await page.json();
    expect(adminPayoutsPageSchema.safeParse(history.data).success).toBe(true);
    const row = history.data.items.find((item: { utr: string }) => item.utr === `UTR${String(stamp).slice(-8)}`);
    expect(row).toMatchObject({ agentName: "Api Agent", grossPaise: 377, tdsPaise: 44, netPaise: 333 });
    expect(row).not.toHaveProperty("phone");
    expect(row).not.toHaveProperty("note");
    expect(row).not.toHaveProperty("email");
    expect(JSON.stringify(history)).not.toContain(note);
    expect(JSON.stringify(history)).not.toContain(phone);

    await prisma.commissionPayout.create({
      data: {
        agentId,
        amountPaise: 100,
        grossPaise: 100,
        tdsPaise: 0,
        netPaise: 100,
        utr: `UTR${String(stamp).slice(-6)}B`,
        paidAt: new Date(),
        note: `secret-note-b-${stamp}`
      }
    });
    const first = await payoutsGet(call("/api/v1/admin/payouts?limit=1", { token: adminToken }));
    const firstBody = (await first.json()).data;
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.nextCursor).toEqual(expect.any(String));
    expect(JSON.stringify(firstBody)).not.toContain(`secret-note-b-${stamp}`);
    const second = await payoutsGet(call(`/api/v1/admin/payouts?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`, { token: adminToken }));
    expect(second.status).toBe(200);
    const secondBody = (await second.json()).data;
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0].id).not.toBe(firstBody.items[0].id);
    const badCursor = await payoutsGet(call("/api/v1/admin/payouts?cursor=not-a-cursor", { token: adminToken }));
    expect(badCursor.status).toBe(400);
  });

  it("adds the leaderboard and business counts to the team", async () => {
    await prisma.business.update({ where: { id: businessId }, data: { agentId } });
    await prisma.shopCommission.create({
      data: { agentId, kind: "TEAM_OVERRIDE", sourceId: `ovr-${stamp}`, amountPaise: 4242, percent: 0, status: "APPROVED" }
    });
    const team = await teamGet(call("/api/v1/admin/agents/team", { token: adminToken }));
    expect(team.status).toBe(200);
    const body = await team.json();
    expect(adminTeamResponseSchema.safeParse(body.data).success).toBe(true);
    const agent = body.data.agents.find((row: { id: string }) => row.id === profileId);
    expect(agent.businessCount).toBeGreaterThanOrEqual(1);
    expect(agent.phone === "" || agent.phone.startsWith("••••")).toBe(true);
    const counted = body.data.businessCounts.find((row: { agentId: string }) => row.agentId === agentId);
    expect(counted.businesses).toBeGreaterThanOrEqual(1);
    expect(counted.name).toBe("Api Agent");
    const leader = body.data.leaderboard.rows.find((row: { leaderId: string }) => row.leaderId === profileId);
    expect(leader.monthSalesPaise).toBeGreaterThanOrEqual(10000);
    expect(leader.overridePaise).toBeGreaterThanOrEqual(4242);
    expect(leader).not.toHaveProperty("email");
    expect(leader).not.toHaveProperty("phone");
  });

  it("returns shop lines, a short-lived proof, and shipment fields", async () => {
    const detail = await orderGet(call(`/api/v1/admin/shop/orders/${orderId}`, { token: adminToken }), { params: { id: orderId } });
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(adminShopOrderDetailSchema.safeParse(body.data).success).toBe(true);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("base64");
    expect(raw).not.toContain(`98111${String(stamp).slice(-5)}`);
    const line = body.data.lines.find((row: { name: string }) => row.name === "Acrylic stand");
    expect(line).toMatchObject({ qty: 2, pricePaise: 50, unitPaise: 50, proofContentType: "image/png" });
    expect(line.proofUrl).toContain("/api/shop-proof");
    expect(body.data.shipment).toEqual(expect.objectContaining({ awb: "AWB12345", courierName: "Manual", provider: "manual", shipmentId: "AWB12345" }));

    const file = await proofGet(new NextRequest(line.proofUrl));
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await file.arrayBuffer()).equals(proofBytes)).toBe(true);
    const badUrl = new URL(line.proofUrl);
    badUrl.searchParams.set("sig", "tampered-signature");
    const bad = await proofGet(new NextRequest(badUrl));
    expect(bad.status).toBe(401);
  });

  it("publishes the admin paths", () => {
    const doc = openApiDocument();
    for (const path of [
      "/api/v1/admin/auth/otp/request",
      "/api/v1/admin/dashboard",
      "/api/v1/admin/inbox",
      "/api/v1/admin/search",
      "/api/v1/admin/users/{id}",
      "/api/v1/admin/businesses/{id}",
      "/api/v1/admin/payments",
      "/api/v1/admin/payments/{id}",
      "/api/v1/admin/commissions",
      "/api/v1/admin/plans/{id}",
      "/api/v1/admin/agents/team",
      "/api/v1/admin/shop/orders/{id}",
      "/api/v1/admin/support/{id}",
      "/api/v1/admin/whatsapp/reconnect",
      "/api/v1/admin/settings",
      "/api/v1/admin/audit",
      "/api/v1/admin/devices/{id}",
      "/api/v1/admin/me",
      "/api/v1/admin/devices/mine",
      "/api/v1/admin/money/summary",
      "/api/v1/admin/payouts"
    ]) {
      expect(doc.paths?.[path], path).toBeTruthy();
    }
  });
});

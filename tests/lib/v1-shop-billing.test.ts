import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as billingGet } from "../../app/api/v1/billing/summary/route";
import { GET as orderGet } from "../../app/api/v1/shop/orders/[id]/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 shop order and billing summary", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.shopOrder.deleteMany({ where: { userId: { in: users } } });
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, path: string) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest(`http://127.0.0.1${path}`, {
      headers: { authorization: `Bearer ${pair.accessToken}` }
    });
  }

  it("returns the timeline and hides another buyer's order", async () => {
    const buyer = await prisma.user.create({ data: { email: `shop-${Date.now()}@example.test`, role: "USER" } });
    const other = await prisma.user.create({ data: { email: `shop-b-${Date.now()}@example.test`, role: "USER" } });
    users.push(buyer.id, other.id);
    const order = await prisma.shopOrder.create({
      data: {
        userId: buyer.id,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalPaise: 10000,
        discountPaise: 0,
        totalPaise: 10000,
        taxablePaise: 8475,
        cgstPaise: 763,
        sgstPaise: 762,
        igstPaise: 0,
        advancePaise: 10000,
        balancePaise: 0
      }
    });
    await prisma.auditLog.create({
      data: {
        userId: buyer.id,
        action: "shop.order.move",
        entity: "ShopOrder",
        entityId: order.id,
        metadata: { from: "PENDING_PAYMENT", to: "PAID" }
      }
    });
    const res = await orderGet(await authed(buyer, `/api/v1/shop/orders/${order.id}`), { params: { id: order.id } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.paymentStatus).toBe("PAID");
    expect(json.data.timeline.map((row: { label: string }) => row.label)).toContain("Paid");
    const hidden = await orderGet(await authed(other, `/api/v1/shop/orders/${order.id}`), { params: { id: order.id } });
    expect(hidden.status).toBe(404);
  });

  it("shows the plan and history without a checkout url", async () => {
    const user = await prisma.user.create({
      data: {
        email: `bill-${Date.now()}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date("2027-01-01T00:00:00.000Z")
      }
    });
    users.push(user.id);
    await prisma.payment.create({
      data: { userId: user.id, amount: 49900, status: "COMPLETED", tier: "STARTER", invoiceNumber: `INV-TEST-${Date.now()}` }
    });
    const res = await billingGet(await authed(user, "/api/v1/billing/summary"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.plan.tier).toBe("STARTER");
    expect(json.data.plan.subscriptionEndsAt.startsWith("2027-01-01")).toBe(true);
    expect(json.data.history[0].amountPaise).toBe(49900);
    expect(JSON.stringify(json.data)).not.toContain("checkoutUrl");
  });
});

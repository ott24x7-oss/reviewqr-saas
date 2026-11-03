import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as orderGet } from "../../app/api/v1/shop/orders/[id]/route";
import { GET as ordersGet } from "../../app/api/v1/shop/orders/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";
import { shopOrderDetailSchema, shopOrdersResponseSchema } from "@reviewqr/shared";

describe("v1 shop order privacy and tracking", () => {
  const users: string[] = [];
  const orderIds: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    if (orderIds.length) {
      await prisma.shopCarrierEvent.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.shopOrder.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("returns delivery details to the owner and hides them from another user", async () => {
    const stamp = Date.now();
    const owner = await prisma.user.create({ data: { email: `shop-order-owner-${stamp}@example.test`, role: "USER" } });
    const other = await prisma.user.create({ data: { email: `shop-order-other-${stamp}@example.test`, role: "USER" } });
    users.push(owner.id, other.id);
    const order = await prisma.shopOrder.create({
      data: {
        userId: owner.id,
        subtotalPaise: 10000,
        discountPaise: 0,
        totalPaise: 10000,
        taxablePaise: 8474,
        cgstPaise: 763,
        sgstPaise: 763,
        igstPaise: 0,
        advancePaise: 10000,
        balancePaise: 0,
        status: "SHIPPED",
        paymentStatus: "PAID",
        addressJson: { name: "Owner", phone: "9876543210", line1: "1 Market Road", line2: "Unit 2", city: "Pune", state: "Maharashtra", pincode: "411001" },
        lines: { create: { sku: "TEST-QR", name: "QR stand", qty: 1, unitPaise: 10000, hsn: "3926", gstPercent: 18, discountPaise: 0, netPaise: 10000, taxablePaise: 8474, cgstPaise: 763, sgstPaise: 763, igstPaise: 0, ships: true, needsDesign: false, needsNfc: false, weightGrams: 500 } },
        shipment: { create: { provider: "delhivery", awb: "DL-TEST-123", courierName: "Delhivery", labelBase64: "must-not-leak", lastError: "private error" } }
      }
    });
    orderIds.push(order.id);
    await prisma.shopCarrierEvent.create({ data: { eventKey: `shop-order-${stamp}`, awb: "DL-TEST-123", status: "In Transit", orderId: order.id } });
    const ownerPair = await issueTokenPair(owner, { deviceName: "shop-order-owner" });
    const otherPair = await issueTokenPair(other, { deviceName: "shop-order-other" });
    const ownerResponse = await orderGet(new NextRequest(`http://127.0.0.1/api/v1/shop/orders/${order.id}`, {
      headers: { authorization: `Bearer ${ownerPair.accessToken}` }
    }), { params: { id: order.id } });
    expect(ownerResponse.status).toBe(200);
    const ownerBody = await ownerResponse.json();
    expect(shopOrderDetailSchema.safeParse(ownerBody.data).success).toBe(true);
    expect(ownerBody.data.shipment.trackingUrl).toBe("https://www.delhivery.com/tracking?uniqueIdentifier=DL-TEST-123");
    expect(ownerBody.data.shipment.latestEvent.status).toBe("In Transit");
    expect(ownerBody.data.address.city).toBe("Pune");
    expect(JSON.stringify(ownerBody.data)).not.toContain("must-not-leak");
    expect(JSON.stringify(ownerBody.data)).not.toContain("private error");

    const ordersResponse = await ordersGet(new NextRequest("http://127.0.0.1/api/v1/shop/orders", {
      headers: { authorization: `Bearer ${ownerPair.accessToken}` }
    }));
    expect(ordersResponse.status).toBe(200);
    expect(shopOrdersResponseSchema.safeParse((await ordersResponse.json()).data).success).toBe(true);

    const otherResponse = await orderGet(new NextRequest(`http://127.0.0.1/api/v1/shop/orders/${order.id}`, {
      headers: { authorization: `Bearer ${otherPair.accessToken}` }
    }), { params: { id: order.id } });
    expect(otherResponse.status).toBe(404);
    expect(JSON.stringify(await otherResponse.json())).not.toContain("DL-TEST-123");
  });
});

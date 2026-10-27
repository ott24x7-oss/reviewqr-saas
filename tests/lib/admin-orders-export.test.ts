import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string; role: string } } }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn(async () => session.current) }));

import { GET as exportGet } from "../../app/api/admin/shop/orders/export/route";
import { prisma } from "../../lib/db";

const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const users: string[] = [];
const orderIds: string[] = [];
let adminId = "";

function must<T>(value: T | undefined): T {
  if (!value) throw new Error("route returned nothing");
  return value;
}

function get(query: string) {
  return new NextRequest(`http://localhost/api/admin/shop/orders/export?${query}`);
}

function order(userId: string, status: "PAID" | "SHIPPED", invoiceNumber: string) {
  return prisma.shopOrder.create({
    data: {
      userId, status, paymentStatus: "PAID", invoiceNumber,
      subtotalPaise: 1000, discountPaise: 0, totalPaise: 1000, taxablePaise: 1000, cgstPaise: 0,
      sgstPaise: 0, igstPaise: 0, advancePaise: 0, balancePaise: 1000,
      lines: { create: { sku: invoiceNumber, name: "Acrylic QR, \"large\"", qty: 2, unitPaise: 500, hsn: "", gstPercent: 0, discountPaise: 0, netPaise: 1000, taxablePaise: 1000, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, ships: false, needsDesign: false, needsNfc: false, weightGrams: 0 } }
    }
  });
}

describe("admin orders CSV export", () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({ data: { email: `oe-admin-${stamp}@example.test`, role: "ADMIN" } });
    const owner = await prisma.user.create({ data: { email: `oe-owner-${stamp}@example.test`, name: "Export, Owner", phone: "9876543210", role: "USER" } });
    adminId = admin.id;
    users.push(admin.id, owner.id);
    orderIds.push((await order(owner.id, "PAID", `OE-${stamp}-1`)).id, (await order(owner.id, "SHIPPED", `OE-${stamp}-2`)).id);
  });

  afterAll(async () => {
    await prisma.shopOrder.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("rejects signed-out users and non-admins", async () => {
    session.current = null;
    expect(must(await exportGet(get(`q=OE-${stamp}`))).status).toBe(401);
    session.current = { user: { id: users[1], role: "USER" } };
    expect(must(await exportGet(get(`q=OE-${stamp}`))).status).toBe(403);
  });

  it("exports the filtered orders with a masked phone and audits the filter", async () => {
    session.current = { user: { id: adminId, role: "ADMIN" } };
    const res = must(await exportGet(get(`q=OE-${stamp}&status=SHIPPED&pageSize=20`)));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const body = await res.text();
    const rows = body.split("\r\n");
    expect(rows[0]).toBe("order,invoice,status,payment,business,customer,email,phone,items,totalPaise,awb,courier,created");
    expect(rows).toHaveLength(2);
    expect(body).toContain(`OE-${stamp}-2`);
    expect(body).not.toContain(`OE-${stamp}-1`);
    expect(body).toContain("\"Export, Owner\"");
    expect(body).toContain(`oe-owner-${stamp}@example.test`);
    expect(body).not.toContain("9876543210");
    expect(body).toContain("3210");
    const audit = await prisma.auditLog.findFirst({ where: { userId: adminId, action: "orders.export" }, select: { metadata: true } });
    expect(audit?.metadata).toMatchObject({ filter: { q: `OE-${stamp}`, status: "SHIPPED" }, rows: 1, truncated: false });
  });

  it("rejects an unknown status filter", async () => {
    session.current = { user: { id: adminId, role: "ADMIN" } };
    expect(must(await exportGet(get("status=DROP_TABLE"))).status).toBe(400);
  });
});

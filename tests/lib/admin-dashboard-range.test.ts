import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadAdminDashboard } from "../../lib/admin/dashboard";
import { prisma } from "../../lib/db";

// A custom range far in the past so no other rows land in it.
const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const users: string[] = [];
const orderIds: string[] = [];
const at = (iso: string) => new Date(iso);

function order(userId: string, createdAt: Date) {
  return prisma.shopOrder.create({
    data: {
      userId, createdAt, status: "PAID", paymentStatus: "PAID", invoiceNumber: `DR-${stamp}`,
      subtotalPaise: 1000, discountPaise: 0, totalPaise: 1000, taxablePaise: 1000, cgstPaise: 0,
      sgstPaise: 0, igstPaise: 0, advancePaise: 0, balancePaise: 1000
    }
  });
}

describe("admin dashboard over a long custom range", () => {
  beforeAll(async () => {
    const a = await prisma.user.create({ data: { email: `dr-a-${stamp}@example.test`, createdAt: at("2000-08-01T06:00:00Z") } });
    const b = await prisma.user.create({ data: { email: `dr-b-${stamp}@example.test`, createdAt: at("2001-03-01T20:00:00Z") } });
    const c = await prisma.user.create({ data: { email: `dr-c-${stamp}@example.test`, createdAt: at("2001-04-10T06:00:00Z") } });
    users.push(a.id, b.id, c.id);
    const business = await prisma.business.create({ data: { ownerId: b.id, name: "Range Cafe", slug: `dr-${stamp}` } });
    const pay = (userId: string, amount: number, createdAt: string, status: "COMPLETED" | "PENDING" = "COMPLETED") =>
      prisma.payment.create({ data: { userId, amount, status, tier: "STARTER", createdAt: at(createdAt) } });
    await pay(a.id, 500, "2000-09-10T06:00:00Z");
    await pay(a.id, 1000, "2001-02-01T06:00:00Z");
    await pay(b.id, 2000, "2001-03-01T20:00:00Z");
    await pay(b.id, 3000, "2001-05-05T06:00:00Z");
    await pay(c.id, 700, "2001-07-19T17:00:00Z");
    await pay(c.id, 900, "2001-07-01T06:00:00Z", "PENDING");
    const shop = await order(b.id, at("2001-06-01T06:00:00Z"));
    orderIds.push(shop.id);
    await prisma.shopCreditNote.create({
      data: { orderId: shop.id, number: `DR-CN-${stamp}`, reason: "test", amountPaise: 250, taxablePaise: 250, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, createdAt: at("2001-06-01T06:00:00Z") }
    });
    await prisma.analyticsDaily.create({ data: { businessId: business.id, day: at("2001-06-02T00:00:00Z"), scans: 7 } });
  });

  afterAll(async () => {
    await prisma.shopCreditNote.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.shopOrder.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("buckets 200 days by India day with first payments, signups and comparisons", async () => {
    const result = await loadAdminDashboard(new URLSearchParams("range=custom&from=2001-01-01&to=2001-07-19"));
    if (!result.ok) throw new Error(result.error);
    const dash = result.data;
    const at = (day: string) => dash.series.days.indexOf(day);
    expect(dash.series.days).toHaveLength(200);
    expect(dash.series.previousRevenue).toHaveLength(200);
    expect(dash.kpis).toMatchObject({
      revenuePaise: 6700,
      previousRevenuePaise: 500,
      newPaid: 2,
      previousNewPaid: 1,
      signups: 2,
      previousSignups: 1,
      scans: 7,
      previousScans: 0,
      shopOrders: 1,
      previousShopOrders: 0,
      refundsPaise: 250,
      previousRefundsPaise: 0
    });
    expect(dash.waterfall).toEqual({ newPaise: 2700, renewalPaise: 4000, refundPaise: 250, netPaise: 6450 });
    expect(dash.activation).toEqual({ activated: 1, total: 2, rate: 50 });
    expect(dash.funnel).toEqual([
      { name: "Signups", value: 2 },
      { name: "Added a business", value: 1 },
      { name: "First payment", value: 2 }
    ]);
    expect(dash.series.revenue[at("2001-03-02")]).toBe(2000);
    expect(dash.series.revenue[at("2001-03-01")]).toBe(0);
    expect(dash.series.paymentCount[at("2001-02-01")]).toBe(1);
    expect(dash.series.newPaid[at("2001-02-01")]).toBe(0);
    expect(dash.series.newPaid[at("2001-03-02")]).toBe(1);
    expect(dash.series.newPaid[at("2001-07-19")]).toBe(1);
    expect(dash.series.signups[at("2001-03-02")]).toBe(1);
    expect(dash.series.shopOrders[at("2001-06-01")]).toBe(1);
    expect(dash.series.scans[at("2001-06-02")]).toBe(7);
    expect(dash.series.previousNewPaid).toBe(1);
    expect(dash.series.previousRevenue.reduce((sum, value) => sum + value, 0)).toBe(500);
    expect(dash.series.revenue.reduce((sum, value) => sum + value, 0)).toBe(6700);
  });

  it("keeps a payment just after India midnight inside a one-day range", async () => {
    const result = await loadAdminDashboard(new URLSearchParams("range=custom&from=2001-03-02&to=2001-03-02"));
    if (!result.ok) throw new Error(result.error);
    expect(result.data.kpis).toMatchObject({ revenuePaise: 2000, previousRevenuePaise: 0, newPaid: 1, previousNewPaid: 0, signups: 1 });
    expect(result.data.series).toMatchObject({ days: ["2001-03-02"], revenue: [2000], newPaid: [1], signups: [1] });
  });
});

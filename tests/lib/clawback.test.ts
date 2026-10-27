import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { pageCommissionReport } from "../../lib/admin/money";
import { loadContractHome } from "../../lib/plans/agent-team";
import { reverseCommissionsForOrder, reverseCommissionsForPayment } from "../../lib/plans/ledger";

describe("commission clawback", () => {
  const users: string[] = [];
  const payments: string[] = [];
  const orders: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.clawbackDue.deleteMany({ where: { agentId: { in: users } } });
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    if (payments.length) await prisma.payment.deleteMany({ where: { id: { in: payments } } });
    if (orders.length) await prisma.shopOrder.deleteMany({ where: { id: { in: orders } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("records a clawback only when a paid-out commission is reversed", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const agent = await prisma.user.create({ data: { email: `claw-${stamp}@example.test`, role: "AGENT", name: "Claw Agent" } });
    const buyer = await prisma.user.create({ data: { email: `claw-buyer-${stamp}@example.test`, role: "USER" } });
    users.push(agent.id, buyer.id);
    const code = `c${stamp}`.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();
    await prisma.agentProfile.create({ data: { userId: agent.id, code, status: "ACTIVE", active: true } });

    const payment = await prisma.payment.create({
      data: { userId: buyer.id, amount: 10000, tier: "STARTER", status: "COMPLETED", provider: "MANUAL" }
    });
    payments.push(payment.id);
    const paidOut = await prisma.commissionPayout.create({
      data: { agentId: agent.id, amountPaise: 4200, grossPaise: 4200, netPaise: 4200, utr: `CLW${stamp}`.slice(0, 12), paidAt: new Date() }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "SALE",
        sourceId: `paid-${stamp}`,
        paymentId: payment.id,
        amountPaise: 4200,
        percent: 10,
        status: "PAID",
        payoutId: paidOut.id
      }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "RENEWAL",
        sourceId: `pending-${stamp}`,
        paymentId: payment.id,
        amountPaise: 1000,
        percent: 10,
        status: "PENDING"
      }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "HARDWARE",
        sourceId: `legacy-paid-${stamp}`,
        paymentId: payment.id,
        amountPaise: 9999,
        percent: 0,
        status: "PAID"
      }
    });

    expect(await reverseCommissionsForPayment(payment.id)).toBe(3);
    const fromPayment = await prisma.clawbackDue.findMany({ where: { agentId: agent.id } });
    expect(fromPayment).toHaveLength(1);
    expect(fromPayment[0]).toMatchObject({ commissionId: expect.any(String), amountPaise: 4200, settledAt: null });
    expect(fromPayment[0]?.reason).toContain(payment.id);

    const approvedOrder = await prisma.shopOrder.create({
      data: {
        userId: buyer.id,
        status: "PAID",
        paymentStatus: "PAID",
        subtotalPaise: 2500,
        discountPaise: 0,
        totalPaise: 2500,
        taxablePaise: 2500,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        advancePaise: 2500,
        balancePaise: 0
      }
    });
    orders.push(approvedOrder.id);
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "ORDER",
        sourceId: `approved-${stamp}`,
        orderId: approvedOrder.id,
        amountPaise: 2500,
        percent: 10,
        status: "APPROVED"
      }
    });
    expect(await reverseCommissionsForOrder(approvedOrder.id)).toBe(1);
    expect(await prisma.clawbackDue.count({ where: { agentId: agent.id } })).toBe(1);

    const paidOrder = await prisma.shopOrder.create({
      data: {
        userId: buyer.id,
        status: "PAID",
        paymentStatus: "REFUNDED",
        subtotalPaise: 1800,
        discountPaise: 0,
        totalPaise: 1800,
        taxablePaise: 1800,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        advancePaise: 1800,
        balancePaise: 0
      }
    });
    orders.push(paidOrder.id);
    const orderPayout = await prisma.commissionPayout.create({
      data: { agentId: agent.id, amountPaise: 1800, grossPaise: 1800, netPaise: 1800, utr: `ORD${stamp}`.slice(0, 12), paidAt: new Date() }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: agent.id,
        kind: "ORDER",
        sourceId: `order-paid-${stamp}`,
        orderId: paidOrder.id,
        amountPaise: 1800,
        percent: 10,
        status: "PAID",
        payoutId: orderPayout.id
      }
    });
    expect(await reverseCommissionsForOrder(paidOrder.id)).toBe(1);
    const clawbacks = await prisma.clawbackDue.findMany({ where: { agentId: agent.id }, orderBy: { amountPaise: "asc" } });
    expect(clawbacks.map((row) => row.amountPaise)).toEqual([1800, 4200]);
    expect(clawbacks.every((row) => row.settledAt == null)).toBe(true);

    const home = await loadContractHome(agent.id);
    expect(home.ok).toBe(true);
    if (!home.ok) return;
    expect(home.data.earnings.clawbackPaise).toBe(6000);

    const listed = await pageCommissionReport(new URLSearchParams(`q=${code}`));
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.items[0]?.clawbackPaise).toBe(6000);
  });
});

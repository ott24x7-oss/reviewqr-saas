import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { clearStalePendingPlans } from "../../lib/plans/downgrade";
import {
  billingPaymentWhere,
  CHECKOUT_ABANDON_MS,
  refuseInvoice,
  statusForRefuse
} from "../../lib/plans/invoice-guard";

const now = new Date("2026-10-23T12:00:00.000Z");

function invoice(overrides: Partial<{
  status: string;
  expiresAt: Date | null;
  checkoutUrl: string | null;
  planId: string | null;
  createdAt: Date;
}>) {
  return {
    status: "PENDING",
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    checkoutUrl: null,
    planId: "plan_legacy_starter",
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    ...overrides
  };
}

describe("youpi invoice guard", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("refuses expired, cancelled, and abandoned invoices and keeps a live downgrade", () => {
    const live = { status: "EXPIRED", pendingPlanId: "plan_legacy_starter" };
    expect(refuseInvoice(invoice({}), live, now)).toBeNull();
    expect(refuseInvoice(invoice({ expiresAt: new Date(now.getTime() - 1000) }), live, now)).toBe("expired");
    expect(refuseInvoice(invoice({}), { status: "CANCELED", pendingPlanId: "plan_legacy_starter" }, now)).toBe("cancelled");
    expect(refuseInvoice(invoice({}), null, now)).toBe("cancelled");
    const abandoned = invoice({
      planId: null,
      expiresAt: null,
      checkoutUrl: null,
      createdAt: new Date(now.getTime() - CHECKOUT_ABANDON_MS - 1000)
    });
    expect(refuseInvoice(abandoned, null, now)).toBe("abandoned");
    expect(
      refuseInvoice(
        invoice({
          planId: null,
          expiresAt: new Date(now.getTime() + 20 * 60 * 1000),
          createdAt: new Date(now.getTime() - 10 * 60 * 1000),
          checkoutUrl: "https://pay.example/checkout"
        }),
        null,
        now
      )
    ).toBeNull();
    expect(statusForRefuse("expired")).toBe("EXPIRED");
    expect(statusForRefuse("abandoned")).toBe("EXPIRED");
    expect(statusForRefuse("cancelled")).toBe("CANCELLED");
    expect(billingPaymentWhere("user_1").status.notIn).toEqual(["EXPIRED", "CANCELLED"]);
  });

  it("marks closed YouPI invoices and leaves a payable downgrade invoice", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const canceled = await prisma.user.create({ data: { email: `inv-cancel-${stamp}@example.test` } });
    const active = await prisma.user.create({ data: { email: `inv-live-${stamp}@example.test` } });
    users.push(canceled.id, active.id);
    const endsAt = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    await prisma.subscription.create({
      data: {
        userId: canceled.id,
        planId: "plan_legacy_growth",
        modules: ["REVIEWS"],
        limits: {},
        tier: "GROWTH",
        status: "CANCELED",
        endsAt,
        pendingPlanId: "plan_legacy_starter",
        pendingDuration: "MONTH_1"
      }
    });
    await prisma.subscription.create({
      data: {
        userId: active.id,
        planId: "plan_legacy_growth",
        modules: ["REVIEWS"],
        limits: {},
        tier: "GROWTH",
        status: "ACTIVE",
        endsAt,
        pendingPlanId: "plan_legacy_starter",
        pendingDuration: "MONTH_1"
      }
    });

    const cancelledInvoice = await prisma.payment.create({
      data: {
        userId: canceled.id,
        amount: 49900,
        status: "PENDING",
        provider: "YOUPI",
        tier: "STARTER",
        periodMonths: 1,
        planId: "plan_legacy_starter",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
      }
    });
    const liveInvoice = await prisma.payment.create({
      data: {
        userId: active.id,
        amount: 49900,
        status: "PENDING",
        provider: "YOUPI",
        tier: "STARTER",
        periodMonths: 1,
        planId: "plan_legacy_starter",
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000)
      }
    });
    const expiredInvoice = await prisma.payment.create({
      data: {
        userId: active.id,
        amount: 49900,
        status: "QUEUED",
        provider: "YOUPI",
        tier: "STARTER",
        periodMonths: 1,
        checkoutUrl: "https://pay.example/old",
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        expiresAt: new Date(now.getTime() - 60 * 1000)
      }
    });
    const abandonedInvoice = await prisma.payment.create({
      data: {
        userId: active.id,
        amount: 49900,
        status: "PENDING",
        provider: "YOUPI",
        tier: "STARTER",
        periodMonths: 1,
        createdAt: new Date(now.getTime() - CHECKOUT_ABANDON_MS - 60 * 1000),
        expiresAt: null
      }
    });

    await clearStalePendingPlans(now, canceled.id);
    await clearStalePendingPlans(now, active.id);

    expect((await prisma.payment.findUnique({ where: { id: cancelledInvoice.id } }))?.status).toBe("CANCELLED");
    expect((await prisma.subscription.findFirst({ where: { userId: canceled.id } }))?.pendingPlanId).toBeNull();
    expect((await prisma.payment.findUnique({ where: { id: liveInvoice.id } }))?.status).toBe("PENDING");
    expect((await prisma.subscription.findFirst({ where: { userId: active.id } }))?.pendingPlanId).toBe("plan_legacy_starter");
    expect((await prisma.payment.findUnique({ where: { id: expiredInvoice.id } }))?.status).toBe("EXPIRED");
    expect((await prisma.payment.findUnique({ where: { id: abandonedInvoice.id } }))?.status).toBe("EXPIRED");
  });
});

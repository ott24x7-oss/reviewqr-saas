import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(),
    shopOrder: { findUnique: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    shopPaymentDelivery: { findUnique: vi.fn(), create: vi.fn() },
    supportTicket: { create: vi.fn() },
    supportMessage: { create: vi.fn() },
    auditLog: { create: vi.fn() }
  };
  return { prisma, youpiGetPayment: vi.fn(), fulfillPaidShopOrder: vi.fn() };
});

vi.mock("../../lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("../../lib/payments/youpi", () => ({
  youpiAmountsMatch: (expected: number, remote: { amountPaise?: number }) => remote.amountPaise === expected,
  youpiConfirmed: (remote: { status?: string; verificationLevel?: number }) => remote.status === "PAID" && remote.verificationLevel === 1,
  youpiGetPayment: mocks.youpiGetPayment,
  youpiMatchesOrder: (remote: { orderId?: string; paymentId?: string }, order: { id: string; providerPaymentId?: string | null }) => remote.orderId === order.id && remote.paymentId === order.providerPaymentId,
  youpiStatusFailed: (status?: string) => ["FAILED", "EXPIRED", "CANCELLED"].includes(String(status || "").toUpperCase())
}));
vi.mock("../../lib/shop/fulfill", () => ({ fulfillPaidShopOrder: mocks.fulfillPaidShopOrder }));

import { settleShopYoupiWebhook } from "../../lib/shop/youpi-settle";

describe("shop YouPI settlement after cancellation", () => {
  const order = {
    id: "shop_order_12345678", userId: "owner", status: "CANCELLED", paymentStatus: "FAILED",
    advancePaise: 10000, providerPaymentId: "payment_1"
  };
  let current: typeof order;
  let deliveries: Set<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    current = { ...order };
    deliveries = new Set();
    mocks.prisma.$transaction.mockImplementation((callback: (tx: typeof mocks.prisma) => unknown) => callback(mocks.prisma));
    mocks.prisma.shopOrder.findUnique.mockImplementation(async () => current);
    mocks.prisma.shopOrder.findFirst.mockResolvedValue(null);
    mocks.prisma.shopOrder.updateMany.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      if (current.status !== "CANCELLED" || !["PENDING", "FAILED"].includes(current.paymentStatus)) return { count: 0 };
      Object.assign(current, data);
      return { count: 1 };
    });
    mocks.prisma.shopPaymentDelivery.findUnique.mockImplementation(async ({ where }: { where: { deliveryId: string } }) =>
      deliveries.has(where.deliveryId) ? { deliveryId: where.deliveryId } : null
    );
    mocks.prisma.shopPaymentDelivery.create.mockImplementation(async ({ data }: { data: { deliveryId: string } }) => {
      deliveries.add(data.deliveryId);
      return data;
    });
    mocks.prisma.supportTicket.create.mockResolvedValue({ id: "ticket_1" });
    mocks.prisma.supportMessage.create.mockResolvedValue({});
    mocks.prisma.auditLog.create.mockResolvedValue({});
    mocks.youpiGetPayment.mockResolvedValue({
      paymentId: "payment_1", orderId: order.id, amountPaise: 10000, status: "PAID", verificationLevel: 1, utr: "UTR123"
    });
  });

  it("records the late payment, opens one admin inbox ticket, and stays idempotent on replay", async () => {
    const input = { orderId: order.id, deliveryId: "delivery_1", gatewayPaymentId: "payment_1" };

    const first = await settleShopYoupiWebhook(input);
    const replay = await settleShopYoupiWebhook(input);
    const differentDeliveryReplay = await settleShopYoupiWebhook({ ...input, deliveryId: "delivery_2" });

    expect(first).toMatchObject({ status: 200, body: { ok: true, paidAfterCancellation: true } });
    expect(replay).toMatchObject({ status: 200, body: { duplicate: true } });
    expect(differentDeliveryReplay).toMatchObject({ status: 200, body: { already: true, paidAfterCancellation: true } });
    expect(current).toMatchObject({ status: "CANCELLED", paymentStatus: "PAID_AFTER_CANCELLATION", providerPaymentId: "payment_1", utr: "UTR123", paidAfterCancellationPaise: 10000 });
    expect(mocks.prisma.shopPaymentDelivery.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.supportTicket.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.supportTicket.create).toHaveBeenCalledWith({
      data: { userId: "owner", subject: "Shop payment after cancellation · 12345678" }
    });
    expect(mocks.prisma.supportMessage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ body: expect.stringContaining("refund the payment or reinstate the order") })
    }));
    expect(mocks.prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "shop.order.payment.after-cancellation" })
    }));
  });
});

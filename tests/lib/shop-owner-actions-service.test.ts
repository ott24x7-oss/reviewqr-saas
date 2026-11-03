import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(),
    shopOrder: { findUnique: vi.fn(), updateMany: vi.fn() },
    shopOrderCancellationRequest: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    supportTicket: { create: vi.fn(), update: vi.fn() },
    supportMessage: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    shippingAddress: { findFirst: vi.fn() },
    shopCart: { findUnique: vi.fn() },
    catalogVariant: { findMany: vi.fn() }
  };
  return {
    prisma,
    canManageShopOrder: vi.fn(),
    rateLimitDb: vi.fn(async () => ({ ok: true, remaining: 4 })),
    enqueueJob: vi.fn(async () => undefined),
    saveShopCart: vi.fn(),
    addShopCartItem: vi.fn(),
    shopCartView: vi.fn(),
    youpiGetPayment: vi.fn(),
    settleShopYoupiWebhook: vi.fn()
  };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitDb: mocks.rateLimitDb }));
vi.mock("@/lib/jobs/store", () => ({ enqueueJob: mocks.enqueueJob }));
vi.mock("@/lib/shop/order-access", () => ({ canManageShopOrder: mocks.canManageShopOrder }));
vi.mock("@/lib/shop/cart-store", () => ({
  saveShopCart: mocks.saveShopCart,
  addShopCartItem: mocks.addShopCartItem,
  shopCartView: mocks.shopCartView
}));
vi.mock("@/lib/payments/youpi", () => ({
  getYoupiConfig: vi.fn(), youpiConfigured: vi.fn(), youpiCreatePayment: vi.fn(),
  youpiGetPayment: mocks.youpiGetPayment,
  youpiAmountsMatch: (expected: number, remote: { amountPaise?: number }) => remote.amountPaise === expected,
  youpiConfirmed: (remote: { status?: string; verificationLevel?: number }) => remote.status === "PAID" && remote.verificationLevel === 1,
  youpiMatchesOrder: (remote: { orderId?: string; paymentId?: string }, order: { id: string; providerPaymentId?: string | null }) => remote.orderId === order.id && remote.paymentId === order.providerPaymentId,
  youpiStatusFailed: (status?: string) => ["FAILED", "EXPIRED", "CANCELLED"].includes(String(status || "").toUpperCase())
}));
vi.mock("../../lib/shop/youpi-settle", () => ({ settleShopYoupiWebhook: mocks.settleShopYoupiWebhook }));

import { buyAgainShopOrder, cancelShopOrder, changeShopOrderAddress } from "../../lib/shop/owner-actions-service";

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "shop_order_12345678", userId: "owner", businessId: null, status: "PENDING_PAYMENT", paymentStatus: "PENDING",
    totalPaise: 10000, advancePaise: 10000, cod: false, addressJson: null, shipment: null, updatedAt: new Date(), ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.$transaction.mockImplementation((callback: (tx: typeof mocks.prisma) => unknown) => callback(mocks.prisma));
  mocks.canManageShopOrder.mockResolvedValue(true);
  mocks.rateLimitDb.mockResolvedValue({ ok: true, remaining: 4 });
  mocks.enqueueJob.mockResolvedValue(undefined);
  mocks.prisma.shopOrderCancellationRequest.findUnique.mockResolvedValue(null);
  mocks.prisma.shopOrderCancellationRequest.create.mockResolvedValue({ status: "PENDING", refundAmountPaise: 10000, refundMethod: "ORIGINAL_PAYMENT_METHOD" });
  mocks.prisma.supportTicket.create.mockResolvedValue({ id: "ticket_1" });
  mocks.prisma.supportMessage.create.mockResolvedValue({});
  mocks.prisma.auditLog.create.mockResolvedValue({});
  mocks.prisma.shippingAddress.findFirst.mockResolvedValue(null);
  mocks.youpiGetPayment.mockResolvedValue(null);
  mocks.settleShopYoupiWebhook.mockResolvedValue({ status: 200, body: { ok: true } });
});

describe("owner shop cancellation service", () => {
  it("cancels an unpaid pending order idempotently", async () => {
    const current = order();
    mocks.prisma.shopOrder.findUnique.mockImplementation(async () => current);
    mocks.prisma.shopOrder.updateMany.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      Object.assign(current, data);
      return { count: 1 };
    });

    const first = await cancelShopOrder("owner", current.id, "Ordered by mistake");
    const second = await cancelShopOrder("owner", current.id, "Ordered by mistake");

    expect(first).toMatchObject({ ok: true, data: { kind: "cancelled", refundAmountPaise: 0 } });
    expect(second).toMatchObject({ ok: true, data: { kind: "cancelled" } });
    expect(mocks.prisma.shopOrder.updateMany).toHaveBeenCalledTimes(1);
    expect(current).toMatchObject({ status: "CANCELLED", paymentStatus: "FAILED" });
  });

  it("settles a confirmed provider payment instead of cancelling", async () => {
    const current = order({ providerPaymentId: "payment_1", checkoutUrl: "https://pay.example/1" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    mocks.youpiGetPayment.mockResolvedValue({
      paymentId: "payment_1", orderId: current.id, amountPaise: 10000, status: "PAID", verificationLevel: 1
    });

    const result = await cancelShopOrder("owner", current.id, "Ordered by mistake");

    expect(result).toEqual({ ok: true, data: { kind: "paid", message: "This order was just paid. It is now being processed." } });
    expect(mocks.settleShopYoupiWebhook).toHaveBeenCalledWith({
      orderId: current.id, deliveryId: `owner-cancel-check:${current.id}`, gatewayPaymentId: "payment_1"
    });
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
  });

  it("refuses cancellation while a provider payment is in progress", async () => {
    const current = order({ providerPaymentId: "payment_1", checkoutUrl: "https://pay.example/1" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    mocks.youpiGetPayment.mockResolvedValue({ paymentId: "payment_1", orderId: current.id, status: "PENDING" });

    await expect(cancelShopOrder("owner", current.id, "Ordered by mistake")).resolves.toMatchObject({
      ok: false, status: 409, error: "A payment is in progress. Try again in a few minutes."
    });
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
  });

  it("refuses cancellation when the provider cannot be checked", async () => {
    const current = order({ providerPaymentId: "payment_1", checkoutUrl: "https://pay.example/1" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    mocks.youpiGetPayment.mockRejectedValue(new Error("provider down"));

    await expect(cancelShopOrder("owner", current.id, "Ordered by mistake")).resolves.toMatchObject({
      ok: false, status: 409, error: "We could not check the payment. Try again in a few minutes."
    });
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
  });

  it("keeps the existing REFUNDED status when cancelling", async () => {
    const current = order({ paymentStatus: "REFUNDED" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    mocks.prisma.shopOrder.updateMany.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      Object.assign(current, data);
      return { count: 1 };
    });

    await cancelShopOrder("owner", current.id, "Ordered by mistake");

    expect(current).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
  });

  it("creates one admin review request for a paid order and returns it on retry", async () => {
    const paid = order({ status: "PAID", paymentStatus: "PAID" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(paid);
    const first = await cancelShopOrder("owner", paid.id, "Ordered by mistake");
    mocks.prisma.shopOrderCancellationRequest.findUnique.mockResolvedValue({ id: "request_1", status: "PENDING", refundAmountPaise: 10000, refundMethod: "ORIGINAL_PAYMENT_METHOD" });
    const second = await cancelShopOrder("owner", paid.id, "Ordered by mistake");

    expect(first).toMatchObject({ ok: true, data: { kind: "request", requestStatus: "PENDING", refundAmountPaise: 10000 } });
    expect(second).toEqual(first);
    expect(mocks.prisma.shopOrderCancellationRequest.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.supportTicket.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
  });

  it.each(["PRINTING", "NFC_WRITTEN", "PACKED", "PICKUP_SCHEDULED", "SHIPPED", "DELIVERED", "RTO", "REPRINT"])("refuses cancellation once status is %s", async (status) => {
    const current = order({ status, paymentStatus: "PAID" });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    const result = await cancelShopOrder("owner", current.id, "Ordered by mistake");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(mocks.prisma.shopOrderCancellationRequest.create).not.toHaveBeenCalled();
  });

  it("returns an already-cancelled order idempotently", async () => {
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(order({ status: "CANCELLED", paymentStatus: "FAILED" }));
    await expect(cancelShopOrder("owner", "shop_order_12345678", "Ordered by mistake")).resolves.toMatchObject({
      ok: true, data: { kind: "cancelled", refundAmountPaise: 0 }
    });
  });

  it("does not let another user cancel or change the address", async () => {
    const current = order();
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(current);
    mocks.canManageShopOrder.mockResolvedValue(false);

    expect(await cancelShopOrder("intruder", current.id, "Ordered by mistake")).toMatchObject({ ok: false, status: 404 });
    expect(await changeShopOrderAddress("intruder", current.id, "address_1")).toMatchObject({ ok: false, status: 404 });
    expect(mocks.prisma.shopOrder.updateMany).not.toHaveBeenCalled();
    expect(mocks.prisma.shippingAddress.findFirst).not.toHaveBeenCalled();
  });

  it("refuses address changes after dispatch", async () => {
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(order({ status: "SHIPPED", shipment: { awb: "AWB123" } }));
    const result = await changeShopOrderAddress("owner", "shop_order_12345678", "address_1");
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(mocks.prisma.shippingAddress.findFirst).not.toHaveBeenCalled();
  });
});

describe("owner buy-again", () => {
  it("skips inactive or unavailable variants", async () => {
    const oldOrder = order({ lines: [{ variantId: "variant_1", sku: "OLD", name: "Old stand", qty: 1, unbranded: true, design: null }] });
    mocks.prisma.shopOrder.findUnique.mockResolvedValue(oldOrder);
    mocks.prisma.catalogVariant.findMany.mockResolvedValue([{ sku: "OLD", active: false, stock: 0, minQty: 1 }]);
    mocks.prisma.shopCart.findUnique.mockResolvedValue(null);
    mocks.saveShopCart.mockResolvedValue({ ok: true, data: { lines: [] } });
    mocks.shopCartView.mockResolvedValue({ lines: [] });

    const result = await buyAgainShopOrder("owner", oldOrder.id);
    expect(result).toMatchObject({ ok: true, data: { skipped: ["Old stand"], cart: { lines: [] } } });
    expect(mocks.addShopCartItem).not.toHaveBeenCalled();
  });
});

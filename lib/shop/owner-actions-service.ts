import { shopDesignSchema } from "@reviewqr/shared";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import type { ServiceResult } from "@/lib/api/result";
import {
  youpiAmountsMatch, youpiConfirmed,
  youpiGetPayment, youpiMatchesOrder, youpiStatusFailed
} from "@/lib/payments/youpi";
import { enqueueJob } from "@/lib/jobs/store";
import { canManageShopOrder } from "./order-access";
import { addressError, sameSupplyState } from "./address";
import { addShopCartItem, saveShopCart, shopCartView } from "./cart-store";
import { canChangeShopAddress, shopCancelDecision, splitBuyAgainLines } from "./owner-actions";
import { isShopOrderStatus } from "./order-status";
import { settleShopYoupiWebhook } from "./youpi-settle";

const REFUND_METHOD = "ORIGINAL_PAYMENT_METHOD";
type CancelShopOrderResult =
  | { kind: "request"; requestStatus: "PENDING" | "APPROVED" | "REJECTED"; refundAmountPaise: number; refundMethod: string | null }
  | { kind: "cancelled"; requestStatus: null; refundAmountPaise: number; refundMethod: null }
  | { kind: "paid"; message: string };

function jsonInput(value: unknown) {
  return value == null ? undefined : JSON.parse(JSON.stringify(value));
}

function makeRateLimitError() {
  return { ok: false as const, status: 429, error: "Too many requests. Please wait and try again." };
}

export async function cancelShopOrder(userId: string, orderId: string, reason: string, ip?: string | null): Promise<ServiceResult<CancelShopOrderResult>> {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, businessId: true, status: true, paymentStatus: true, totalPaise: true, advancePaise: true, cod: true, providerPaymentId: true, checkoutUrl: true }
  });
  if (!order || !(await canManageShopOrder(userId, order))) return { ok: false as const, status: 404, error: "Order not found" };
  const cleanReason = reason.trim().slice(0, 500);
  if (!cleanReason) return { ok: false as const, status: 400, error: "Choose a cancellation reason" };

  const existing = await prisma.shopOrderCancellationRequest.findUnique({ where: { orderId }, select: { id: true, status: true, refundAmountPaise: true, refundMethod: true } });
  if (existing) return { ok: true as const, data: { kind: "request" as const, requestStatus: existing.status, refundAmountPaise: existing.refundAmountPaise, refundMethod: existing.refundMethod } };
  if (order.status === "CANCELLED") return { ok: true as const, data: { kind: "cancelled" as const, requestStatus: null, refundAmountPaise: 0, refundMethod: null } };
  const decision = shopCancelDecision(order.status, order.paymentStatus, order.totalPaise, order.cod ? order.advancePaise : order.totalPaise);
  if (!decision.allowed) return { ok: false as const, status: 409, error: decision.reason };

  const limited = await rateLimitDb({ key: `shop-cancel:${userId}`, limit: 5, windowSeconds: 3600 });
  if (!limited.ok) return makeRateLimitError();

  if (decision.kind === "cancel") {
    if (decision.refundPaise > 0) return { ok: false as const, status: 409, error: "This order needs admin review" };
    if (order.checkoutUrl && !order.providerPaymentId) {
      return { ok: false as const, status: 409, error: "A payment is in progress. Try again in a few minutes." };
    }
    if (order.providerPaymentId) {
      let remote;
      try {
        remote = await youpiGetPayment(order.providerPaymentId);
      } catch {
        return { ok: false as const, status: 409, error: "We could not check the payment. Try again in a few minutes." };
      }
      if (youpiConfirmed(remote)) {
        if (!youpiMatchesOrder(remote, { id: order.id, providerPaymentId: order.providerPaymentId }) || !youpiAmountsMatch(order.advancePaise, remote)) {
          return { ok: false as const, status: 409, error: "We could not verify the payment. Try again in a few minutes." };
        }
        const settled = await settleShopYoupiWebhook({
          orderId: order.id,
          deliveryId: `owner-cancel-check:${order.id}`,
          gatewayPaymentId: order.providerPaymentId
        });
        if (settled.status !== 200) {
          const body = settled.body as { error?: string };
          return { ok: false as const, status: 409, error: body.error || "We could not settle the payment. Try again in a few minutes." };
        }
        const body = settled.body as { paidAfterCancellation?: boolean };
        return {
          ok: true as const,
          data: {
            kind: "paid" as const,
            message: body.paidAfterCancellation
              ? "This order was paid after cancellation. Support will review whether to refund or reinstate it."
              : "This order was just paid. It is now being processed."
          }
        };
      }
      if (!youpiStatusFailed(remote.status)) {
        return { ok: false as const, status: 409, error: "A payment is in progress. Try again in a few minutes." };
      }
    }
    const changed = await prisma.$transaction(async (tx) => {
      const update = await tx.shopOrder.updateMany({
        where: { id: order.id, status: order.status as never, paymentStatus: order.paymentStatus as never },
        data: { status: "CANCELLED", paymentStatus: order.paymentStatus === "PENDING" ? "FAILED" : order.paymentStatus }
      });
      if (!update.count) return false;
      await tx.auditLog.create({
        data: {
          userId, action: "shop.order.move", entity: "ShopOrder", entityId: order.id, ip: ip || undefined,
          metadata: { from: order.status, to: "CANCELLED", via: "owner-cancel", reason: cleanReason }
        }
      });
      return true;
    });
    if (!changed) {
      const current = await prisma.shopOrder.findUnique({ where: { id: order.id }, select: { status: true } });
      if (current?.status === "CANCELLED") return { ok: true as const, data: { kind: "cancelled" as const, requestStatus: null, refundAmountPaise: 0, refundMethod: null } };
      return { ok: false as const, status: 409, error: "This order changed. Refresh and try again." };
    }
    await enqueueJob({ type: "shop.notify", payload: { orderId: order.id, status: "CANCELLED" }, idempotencyKey: `shop.notify:${order.id}:owner-cancel` }).catch(() => undefined);
    return { ok: true as const, data: { kind: "cancelled" as const, requestStatus: null, refundAmountPaise: 0, refundMethod: null } };
  }

  if (order.userId !== userId) return { ok: false as const, status: 403, error: "Only the buyer can request an order cancellation" };
  try {
    const created = await prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: { userId, subject: `Shop cancellation request · ${orderId.slice(-8)}` }
      });
      const request = await tx.shopOrderCancellationRequest.create({
        data: {
          orderId: order.id, userId, ticketId: ticket.id, reason: cleanReason,
          refundAmountPaise: decision.refundPaise, refundMethod: REFUND_METHOD
        }
      });
      await tx.supportMessage.create({
        data: {
          ticketId: ticket.id, authorId: userId,
          body: `Order ${order.id}\nStatus: ${order.status}\nRequested refund: ${decision.refundPaise} paise to the original payment method after review.\nReason: ${cleanReason}\nshop-order-cancel-request:${request.id}`
        }
      });
      await tx.auditLog.create({
        data: {
          userId, action: "shop.order.cancel.request", entity: "ShopOrder", entityId: order.id, ip: ip || undefined,
          reason: cleanReason,
          metadata: { from: order.status, requestStatus: "PENDING", requestId: request.id, ticketId: ticket.id, refundAmountPaise: decision.refundPaise, refundMethod: REFUND_METHOD }
        }
      });
      return request;
    });
    return { ok: true as const, data: { kind: "request" as const, requestStatus: created.status, refundAmountPaise: created.refundAmountPaise, refundMethod: created.refundMethod } };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const current = await prisma.shopOrderCancellationRequest.findUnique({ where: { orderId }, select: { status: true, refundAmountPaise: true, refundMethod: true } });
      if (current) return { ok: true as const, data: { kind: "request" as const, requestStatus: current.status, refundAmountPaise: current.refundAmountPaise, refundMethod: current.refundMethod } };
    }
    throw error;
  }
}

export async function changeShopOrderAddress(userId: string, orderId: string, addressId: string, ip?: string | null) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { shipment: { select: { awb: true, shipmentId: true } } }
  });
  if (!order || !(await canManageShopOrder(userId, order))) return { ok: false as const, status: 404, error: "Order not found" };
  if (order.userId !== userId) return { ok: false as const, status: 403, error: "Only the buyer can change the delivery address" };
  if (!canChangeShopAddress(order.status, !!(order.shipment?.awb || order.shipment?.shipmentId))) return { ok: false as const, status: 409, error: "The delivery address can no longer be changed" };
  const address = await prisma.shippingAddress.findFirst({ where: { id: addressId, userId: order.userId } });
  if (!address) return { ok: false as const, status: 400, error: "Choose one of your saved addresses" };
  const oldValue = order.addressJson && typeof order.addressJson === "object" && !Array.isArray(order.addressJson)
    ? order.addressJson as Record<string, unknown>
    : null;
  if (!oldValue) return { ok: false as const, status: 409, error: "This order has no original shipping quote to compare" };
  if (address.pincode !== oldValue.pincode || !sameSupplyState(address.state, typeof oldValue.state === "string" ? oldValue.state : null)) {
    return { ok: false as const, status: 409, error: "Address changes must keep the original PIN code and state so the order price stays the same" };
  }
  const next = { name: address.name, phone: address.phone, line1: address.line1, line2: address.line2, city: address.city, state: address.state, pincode: address.pincode };
  const valid = addressError(next);
  if (valid) return { ok: false as const, status: 400, error: valid };
  const addressChanged = await prisma.$transaction(async (tx) => {
    const changed = await tx.shopOrder.updateMany({
      where: { id: order.id, status: order.status, updatedAt: order.updatedAt },
      data: { addressJson: next }
    });
    if (!changed.count) return false;
    await tx.auditLog.create({
      data: {
        userId, action: "shop.order.address.change", entity: "ShopOrder", entityId: order.id, ip: ip || undefined,
        before: jsonInput(oldValue), after: jsonInput(next), metadata: { shippingRequoted: false, samePincode: true, sameState: true }
      }
    });
    return true;
  });
  if (!addressChanged) return { ok: false as const, status: 409, error: "The order changed. Refresh and try again." };
  return { ok: true as const, data: { address: next } };
}

export async function buyAgainShopOrder(userId: string, orderId: string, ip?: string | null) {
  const limited = await rateLimitDb({ key: `shop-buy-again:${userId}`, limit: 10, windowSeconds: 3600 });
  if (!limited.ok) return makeRateLimitError();
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: { lines: { select: { variantId: true, sku: true, name: true, qty: true, unbranded: true, design: true } } }
  });
  if (!order || !(await canManageShopOrder(userId, order))) return { ok: false as const, status: 404, error: "Order not found" };
  const baseLines = order.lines.filter((line) => line.variantId !== null).map((line) => ({
    sku: line.sku, qty: line.qty, unbranded: line.unbranded,
    design: shopDesignSchema.safeParse(line.design).success ? shopDesignSchema.parse(line.design) : null,
    name: line.name
  }));
  const variants = baseLines.length ? await prisma.catalogVariant.findMany({
    where: { sku: { in: baseLines.map((line) => line.sku) } }, select: { sku: true, active: true, stock: true, minQty: true }
  }) : [];
  const split = splitBuyAgainLines(baseLines, variants);
  const current = await prisma.shopCart.findUnique({ where: { userId }, select: { addressId: true } });
  const reset = await saveShopCart(userId, {
    businessId: order.businessId,
    addressId: current?.addressId || null,
    couponCode: null, referralCode: null, buyerGstin: null, buyerLegalName: null, lines: []
  }, "app");
  if (!reset.ok) return reset;
  const skipped = [...split.skipped];
  for (const line of split.available) {
    const parsedDesign = shopDesignSchema.safeParse(line.design);
    const result = await addShopCartItem(userId, { sku: line.sku, qty: line.qty, unbranded: line.unbranded, design: parsedDesign.success ? parsedDesign.data : null }, "app");
    if (!result.ok) skipped.push(line.name);
  }
  const cart = await shopCartView(userId, "app");
  await prisma.auditLog.create({
    data: { userId, action: "shop.order.buy-again", entity: "ShopOrder", entityId: order.id, ip: ip || undefined, metadata: { added: cart.lines.map((line) => line.sku), skipped } }
  });
  return { ok: true as const, data: { cart, skipped } };
}

export async function resumeShopPayment(userId: string, orderId: string, _ip?: string | null) {
  const order = await prisma.shopOrder.findUnique({ where: { id: orderId }, select: { id: true, userId: true, businessId: true, status: true, paymentStatus: true, advancePaise: true, checkoutUrl: true } });
  if (!order || !(await canManageShopOrder(userId, order))) return { ok: false as const, status: 404, error: "Order not found" };
  if (order.status !== "PENDING_PAYMENT" || order.paymentStatus !== "PENDING") return { ok: false as const, status: 409, error: "This order no longer needs payment" };
  if (order.checkoutUrl) return { ok: true as const, data: { checkoutUrl: order.checkoutUrl } };
  const limited = await rateLimitDb({ key: `shop-order-payment:${userId}`, limit: 8, windowSeconds: 3600 });
  if (!limited.ok) return makeRateLimitError();
  return { ok: false as const, status: 410, error: "A new payment session cannot be started for this order." };
}

export async function reviewShopCancellationRequest(ticketId: string, adminId: string, action: "approve-cancel" | "reject-cancel", reason: string, ip?: string | null) {
  const request = await prisma.shopOrderCancellationRequest.findUnique({ where: { ticketId }, include: { order: true } });
  if (!request) return { ok: false as const, status: 404, error: "Cancellation request not found" };
  if (request.status !== "PENDING") {
    return { ok: true as const, data: { changed: false, status: request.status, orderStatus: request.order.status } };
  }
  const cleanReason = reason.trim().slice(0, 500);
  if (!cleanReason) return { ok: false as const, status: 400, error: "Enter a review reason" };
  if (action === "approve-cancel" && (!isShopOrderStatus(request.order.status) || !shopCancelDecision(request.order.status, request.order.paymentStatus, request.order.totalPaise, request.order.cod ? request.order.advancePaise : request.order.totalPaise).allowed)) {
    return { ok: false as const, status: 409, error: "The order can no longer be cancelled" };
  }
  const status = action === "approve-cancel" ? "APPROVED" : "REJECTED";
  const result = await prisma.$transaction(async (tx) => {
    const requestUpdate = await tx.shopOrderCancellationRequest.updateMany({ where: { id: request.id, status: "PENDING" }, data: { status, reviewedAt: new Date(), reviewedById: adminId } });
    if (!requestUpdate.count) return false;
    let orderStatus = request.order.status;
    if (action === "approve-cancel") {
      const orderUpdate = await tx.shopOrder.updateMany({ where: { id: request.orderId, status: request.order.status, paymentStatus: "PAID" }, data: { status: "CANCELLED" } });
      if (!orderUpdate.count) throw new Error("The order changed and could not be cancelled");
      orderStatus = "CANCELLED";
      await tx.auditLog.create({ data: { userId: adminId, action: "shop.order.move", entity: "ShopOrder", entityId: request.orderId, ip: ip || undefined, reason: cleanReason, metadata: { from: request.order.status, to: "CANCELLED", via: "cancellation-request-approved" } } });
    }
    await tx.auditLog.create({
      data: { userId: adminId, action: `shop.order.cancel.${action === "approve-cancel" ? "approved" : "rejected"}`, entity: "ShopOrder", entityId: request.orderId, ip: ip || undefined, reason: cleanReason, metadata: { requestId: request.id, from: "PENDING", to: status, refundAmountPaise: request.refundAmountPaise, refundHandledSeparately: true } }
    });
    await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "CLOSED" } });
    await tx.supportMessage.create({ data: { ticketId, authorId: adminId, body: `Cancellation request ${status.toLowerCase()}. ${cleanReason}` } });
    return orderStatus;
  });
  if (result === false) return { ok: true as const, data: { changed: false, status: request.status, orderStatus: request.order.status } };
  if (action === "approve-cancel") {
    await enqueueJob({ type: "shop.notify", payload: { orderId: request.orderId, status: "CANCELLED" }, idempotencyKey: `shop.notify:${request.orderId}:cancellation-approved` }).catch(() => undefined);
  }
  return { ok: true as const, data: { changed: true, status, orderStatus: result } };
}

/**
 * Settle one YouPI delivery against a shop order.
 * The plan webhook calls this only after the id is not a plan Payment.
 */
import { prisma } from "../db";
import {
  youpiAmountsMatch,
  youpiConfirmed,
  youpiGetPayment,
  youpiMatchesOrder,
  youpiStatusFailed
} from "../payments/youpi";
import { fulfillPaidShopOrder } from "./fulfill";
import { shopWebhookAction } from "./webhook-action";

export async function settleShopYoupiWebhook(input: {
  orderId: string;
  deliveryId: string;
  gatewayPaymentId: string;
  eventUtr?: string | null;
}) {
  if (!input.orderId) return { status: 404, body: { error: "Unknown order" } };
  const order = await prisma.shopOrder.findUnique({ where: { id: input.orderId } });
  if (!order) return { status: 404, body: { error: "Unknown order" } };

  const seen = await prisma.shopPaymentDelivery.findUnique({ where: { deliveryId: input.deliveryId } });
  if (!input.gatewayPaymentId && !order.providerPaymentId) {
    return { status: 400, body: { error: "Missing payment id" } };
  }
  const gatewayId = input.gatewayPaymentId || order.providerPaymentId || "";

  let remote;
  try {
    remote = await youpiGetPayment(gatewayId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm payment";
    return { status: 502, body: { error: message } };
  }

  const action = shopWebhookAction({
    deliverySeen: Boolean(seen),
    matchesOrder: youpiMatchesOrder(remote, { id: order.id, providerPaymentId: order.providerPaymentId }),
    amountMatches: youpiAmountsMatch(order.advancePaise, remote),
    confirmed: youpiConfirmed(remote),
    failed: youpiStatusFailed(remote.status)
  });

  if (action.action === "duplicate") return { status: 200, body: { ok: true, duplicate: true } };
  if (action.action === "reject") return { status: 400, body: { error: action.error } };
  if (action.action === "wait") return { status: 503, body: { error: "Payment not settled yet" } };

  if (action.action === "fulfill" && order.status === "CANCELLED" && order.paymentStatus === "PAID_AFTER_CANCELLATION") {
    return { status: 200, body: { ok: true, already: true, paidAfterCancellation: true } };
  }

  if (
    action.action === "fulfill" && order.status === "CANCELLED" &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED")
  ) {
    const paymentId = remote.paymentId || gatewayId;
    const utr = remote.utr || input.eventUtr || null;
    const recorded = await prisma.$transaction(async (tx) => {
      const clash = await tx.shopOrder.findFirst({
        where: { providerPaymentId: paymentId, NOT: { id: order.id } },
        select: { id: true }
      });
      if (clash) return { recorded: false, conflict: true };

      const changed = await tx.shopOrder.updateMany({
        where: { id: order.id, status: "CANCELLED", paymentStatus: { in: ["PENDING", "FAILED"] } },
        data: {
          paymentStatus: "PAID_AFTER_CANCELLATION",
          providerPaymentId: paymentId,
          utr,
          paidAfterCancellationPaise: order.advancePaise,
          verifiedVia: "webhook",
          paidAt: new Date()
        }
      });
      if (!changed.count) return { recorded: false, conflict: false };

      await tx.shopPaymentDelivery.create({ data: { deliveryId: input.deliveryId, orderId: order.id } });
      const ticket = await tx.supportTicket.create({
        data: { userId: order.userId, subject: `Shop payment after cancellation · ${order.id.slice(-8)}` }
      });
      await tx.supportMessage.create({
        data: {
          ticketId: ticket.id,
          authorId: order.userId,
          body: `Order ${order.id}\nPayment received after cancellation.\nProvider payment: ${paymentId}\nUTR: ${utr || "Not provided"}\nAmount: ${order.advancePaise} paise.\nAdmin action required: refund the payment or reinstate the order.\nshop-order-paid-after-cancellation:${order.id}`
        }
      });
      await tx.auditLog.create({
        data: {
          userId: order.userId,
          action: "shop.order.payment.after-cancellation",
          entity: "ShopOrder",
          entityId: order.id,
          metadata: {
            from: order.paymentStatus,
            to: "PAID_AFTER_CANCELLATION",
            provider: "youpi",
            providerPaymentId: paymentId,
            utr,
            amountPaise: order.advancePaise,
            ticketId: ticket.id
          }
        }
      });
      return { recorded: true, conflict: false };
    });
    if (recorded.conflict) return { status: 400, body: { error: "Payment reference already used" } };
    return {
      status: 200,
      body: { ok: true, already: !recorded.recorded, paidAfterCancellation: true }
    };
  }

  try {
    await prisma.shopPaymentDelivery.create({ data: { deliveryId: input.deliveryId, orderId: order.id } });
  } catch {
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  if (action.action === "fail") {
    await prisma.shopOrder.updateMany({
      where: { id: order.id, paymentStatus: "PENDING", status: "PENDING_PAYMENT" },
      data: { paymentStatus: "FAILED", status: "CANCELLED" }
    });
    return { status: 200, body: { ok: true } };
  }

  const settled = await fulfillPaidShopOrder({
    orderId: order.id,
    providerPaymentId: remote.paymentId || gatewayId,
    utr: remote.utr || input.eventUtr || null,
    verifiedVia: "webhook",
    expectedAmountPaise: order.advancePaise
  });
  if (!settled.ok) return { status: 409, body: { error: settled.error } };
  return { status: 200, body: { ok: true, already: settled.already } };
}

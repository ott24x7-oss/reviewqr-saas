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

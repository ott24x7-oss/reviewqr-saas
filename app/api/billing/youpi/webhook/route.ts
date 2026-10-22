import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activateCompletedPayment } from "@/lib/subscription";
import { creditRenewalCommission } from "@/lib/shop/renewal-commission";
import { settleShopYoupiWebhook } from "@/lib/shop/youpi-settle";
import {
  getYoupiConfig,
  verifyYoupiWebhook,
  youpiAmountsMatch,
  youpiConfirmed,
  youpiGetPayment,
  youpiMatchesOrder,
  youpiStatusFailed
} from "@/lib/payments/youpi";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const cfg = await getYoupiConfig();
  const verified = verifyYoupiWebhook({
    rawBody,
    signature: req.headers.get("x-gateway-signature") || "",
    timestamp: req.headers.get("x-gateway-timestamp") || "",
    secret: cfg.webhookSecret
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }

  const deliveryId = req.headers.get("x-gateway-delivery-id") || "";
  if (!deliveryId) return NextResponse.json({ error: "Missing delivery id" }, { status: 400 });

  const [planDelivery, shopDelivery] = await Promise.all([
    prisma.paymentDelivery.findUnique({ where: { deliveryId } }),
    prisma.shopPaymentDelivery.findUnique({ where: { deliveryId } })
  ]);
  if (planDelivery || shopDelivery) return NextResponse.json({ ok: true, duplicate: true });

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = String(event.orderId || "");
  const payment = orderId
    ? await prisma.payment.findUnique({ where: { id: orderId } })
    : null;
  if (!payment) {
    const settled = await settleShopYoupiWebhook({
      orderId,
      deliveryId,
      gatewayPaymentId: String(event.paymentId || ""),
      eventUtr: event.utr || null
    });
    return NextResponse.json(settled.body, { status: settled.status });
  }

  const alreadyDelivered = await prisma.paymentDelivery.findUnique({ where: { deliveryId } });
  if (alreadyDelivered) return NextResponse.json({ ok: true, duplicate: true });

  const gatewayId = String(event.paymentId || payment.providerPaymentId || "");
  if (!gatewayId) return NextResponse.json({ error: "Missing payment id" }, { status: 400 });

  let remote;
  try {
    remote = await youpiGetPayment(gatewayId);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Could not confirm payment" }, { status: 502 });
  }

  if (!youpiMatchesOrder(remote, payment)) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }
  if (!youpiAmountsMatch(payment.amount, remote)) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  // Not settled, or paid but not yet seen in a bank alert. Do not record the
  // delivery id, so the gateway can retry.
  if (!youpiConfirmed(remote) && !youpiStatusFailed(remote.status)) {
    return NextResponse.json({ error: "Payment not settled yet" }, { status: 503 });
  }

  try {
    await prisma.paymentDelivery.create({
      data: { deliveryId, paymentId: payment.id }
    });
  } catch {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (youpiConfirmed(remote)) {
    const result = await activateCompletedPayment({
      paymentId: payment.id,
      providerPaymentId: remote.paymentId || gatewayId,
      providerOrderId: payment.id,
      utr: remote.utr || event.utr || null,
      payerVpa: typeof event.payerVpa === "string" ? event.payerVpa : typeof event.vpa === "string" ? event.vpa : null,
      verifiedVia: "webhook",
      expectedAmountPaise: payment.amount,
      expectedOrderId: payment.id
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    if (!result.already) {
      try {
        await creditRenewalCommission(payment.userId, payment.id, payment.amount);
      } catch (error) {
        console.warn("[shop] could not record renewal commission", error);
      }
    }
    return NextResponse.json({ ok: true, already: result.already });
  }

  if (youpiStatusFailed(remote.status)) {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: { in: ["PENDING", "QUEUED"] } },
      data: { status: "FAILED" }
    });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getPaymentsConfig } from "@/lib/settings";
import { pendingForInvoice, refuseInvoice, statusForRefuse } from "@/lib/plans/invoice-guard";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/** Resume an existing invoice with its saved gateway link or own UPI details. */
export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimitDb({ key: `invoice-pay:${user.id}`, limit: 8, windowSeconds: 3600 });
  if (!limit.ok) return NextResponse.json({ error: "Too many payment attempts. Please wait." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
  const payment = await prisma.payment.findFirst({
    where: {
      id: String(body.paymentId || ""),
      userId: user.id,
      provider: { in: ["YOUPI", "UPI"] },
      status: { in: ["PENDING", "QUEUED"] },
      amount: { gt: 0 }
    }
  });
  if (!payment) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    select: { status: true, pendingPlanId: true }
  });
  const reason = refuseInvoice(payment, pendingForInvoice(subs, payment.planId), new Date());
  if (reason) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: statusForRefuse(reason) } });
    return NextResponse.json({ error: "This invoice is no longer payable." }, { status: 409 });
  }
  if (payment.checkoutUrl) return NextResponse.json({ id: payment.id, checkoutUrl: payment.checkoutUrl });
  if (payment.providerPaymentId) {
    return NextResponse.json({ error: "This existing payment is still processing. Wait for confirmation." }, { status: 409 });
  }

  const cfg = await getPaymentsConfig();
  if (cfg.upiGateway !== "manual" || !cfg.upiEnabled || !cfg.upiId) {
    return NextResponse.json({ error: "Own UPI payments are not available right now." }, { status: 400 });
  }

  if (payment.provider === "YOUPI") {
    const changed = await prisma.payment.updateMany({
      where: { id: payment.id, provider: "YOUPI", status: { in: ["PENDING", "QUEUED"] }, providerPaymentId: null },
      data: { provider: "UPI", method: "upi", status: "PENDING" }
    });
    if (!changed.count) return NextResponse.json({ error: "This invoice changed while payment was starting. Refresh the page." }, { status: 409 });
  } else if (payment.method !== "upi") {
    await prisma.payment.update({ where: { id: payment.id }, data: { method: "upi" } });
  }

  const amount = (payment.amount / 100).toFixed(2);
  const link = `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(cfg.upiPayeeName || "QR24x7")}&am=${amount}&cu=INR&tn=${encodeURIComponent(`QR24x7 ${payment.id.slice(-8)}`)}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  return NextResponse.json({
    id: payment.id,
    amountPaise: payment.amount,
    expiresAt: payment.expiresAt,
    checkoutUrl: null,
    upi: { id: cfg.upiId, payee: cfg.upiPayeeName || "QR24x7", qr, link }
  });
}

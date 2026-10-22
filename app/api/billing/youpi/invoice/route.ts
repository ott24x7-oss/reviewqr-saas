import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { getYoupiConfig, youpiConfigured, youpiCreatePayment } from "@/lib/payments/youpi";

export const dynamic = "force-dynamic";

/** Checkout for an invoice that already exists, such as a scheduled downgrade. */
export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await rateLimitDb({ key: `youpi-invoice:${user.id}`, limit: 8, windowSeconds: 3600 });
  if (!limit.ok) return NextResponse.json({ error: "Too many payment attempts. Please wait." }, { status: 429 });
  const cfg = await getYoupiConfig();
  if (!youpiConfigured(cfg)) return NextResponse.json({ error: "UPI checkout is not available right now." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { paymentId?: string };
  const payment = await prisma.payment.findFirst({
    where: {
      id: String(body.paymentId || ""),
      userId: user.id,
      provider: "YOUPI",
      status: { in: ["PENDING", "QUEUED"] },
      amount: { gt: 0 }
    }
  });
  if (!payment) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (payment.checkoutUrl) return NextResponse.json({ id: payment.id, checkoutUrl: payment.checkoutUrl });

  try {
    const remote = await youpiCreatePayment({
      orderId: payment.id,
      amountPaise: payment.amount,
      returnUrl: absoluteUrl(`/dashboard/billing?payment=${payment.id}`),
      idempotencyKey: payment.id
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: remote.paymentId || undefined,
        providerOrderId: remote.orderId || payment.id,
        checkoutUrl: remote.checkoutUrl || undefined,
        queuePosition: remote.queuePosition || null,
        status: String(remote.status || "").toUpperCase() === "QUEUED" ? "QUEUED" : payment.status
      }
    });
    return NextResponse.json({ id: payment.id, checkoutUrl: remote.checkoutUrl || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start payment";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

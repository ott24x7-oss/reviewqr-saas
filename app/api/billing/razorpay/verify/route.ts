import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getRazorpay, verifyRazorpaySignature } from "@/lib/payments";
import { prisma } from "@/lib/db";
import { activateCompletedPayment } from "@/lib/subscription";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string()
});

function razorpayEnabled() {
  return process.env.PAYMENTS_RAZORPAY_ENABLED === "true";
}

export async function POST(req: NextRequest) {
  if (!razorpayEnabled()) {
    return NextResponse.json({ error: "Razorpay is disabled" }, { status: 404 });
  }

  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const ok = await verifyRazorpaySignature(parsed.data);
  if (!ok) {
    await prisma.payment
      .updateMany({
        where: {
          providerOrderId: parsed.data.orderId,
          userId: user.id,
          status: { in: ["PENDING", "QUEUED"] }
        },
        data: { status: "FAILED" }
      })
      .catch(() => {});
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: parsed.data.orderId, userId: user.id }
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const rzp = await getRazorpay();
  const remote = (await rzp.payments.fetch(parsed.data.paymentId)) as {
    amount?: number;
    order_id?: string;
    status?: string;
  };
  if (remote.order_id && remote.order_id !== parsed.data.orderId) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }
  if (typeof remote.amount === "number" && remote.amount !== payment.amount) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }
  if (remote.status && remote.status !== "captured" && remote.status !== "authorized") {
    return NextResponse.json({ error: "Payment is not captured" }, { status: 400 });
  }

  const result = await activateCompletedPayment({
    paymentId: payment.id,
    providerPaymentId: parsed.data.paymentId,
    providerOrderId: parsed.data.orderId,
    verifiedVia: "razorpay",
    expectedAmountPaise: payment.amount,
    expectedOrderId: payment.id
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({
    ok: true,
    already: result.already,
    tier: payment.tier,
    expiresAt: result.expiresAt
  });
}

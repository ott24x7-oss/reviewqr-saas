import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { verifyRazorpaySignature } from "@/lib/payments";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string()
});

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const ok = await verifyRazorpaySignature(parsed.data);
  if (!ok) {
    await prisma.payment
      .updateMany({
        where: { providerOrderId: parsed.data.orderId, userId: user.id },
        data: { status: "FAILED" }
      })
      .catch(() => {});
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { providerOrderId: parsed.data.orderId, userId: user.id }
  });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const now = new Date();
  const newExpiry = new Date(
    Math.max(
      user.subscriptionEndsAt?.getTime() || now.getTime(),
      now.getTime()
    ) + payment.periodMonths * 30 * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        providerPaymentId: parsed.data.paymentId
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: payment.tier,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: newExpiry
      }
    })
  ]);

  return NextResponse.json({ ok: true, tier: payment.tier, expiresAt: newExpiry });
}

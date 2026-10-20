import { NextRequest, NextResponse } from "next/server";
import type { SubscriptionTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPlan } from "@/lib/payments";
import { rateLimitDb } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { getYoupiConfig, youpiConfigured, youpiCreatePayment } from "@/lib/payments/youpi";

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimitDb({ key: `youpi:${user.id}`, limit: 8, windowSeconds: 3600 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many payment attempts. Please wait." }, { status: 429 });
  }

  const cfg = await getYoupiConfig();
  if (!youpiConfigured(cfg)) {
    return NextResponse.json({ error: "UPI checkout is not available right now." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { tier?: string; months?: number };
  const tier = String(body.tier || "").toUpperCase() as SubscriptionTier;
  const months = Number(body.months) === 12 ? 12 : 1;
  if (!["STARTER", "GROWTH", "AGENCY"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = await getPlan(tier);
  const amount = months >= 12 ? plan.yearly : plan.monthly;
  if (!amount || amount <= 0) return NextResponse.json({ error: "This plan is free" }, { status: 400 });

  const ownPending = await prisma.payment.findFirst({
    where: { userId: user.id, provider: "YOUPI", status: "PENDING" },
    orderBy: { createdAt: "desc" }
  });
  if (ownPending?.checkoutUrl) {
    return NextResponse.json({
      id: ownPending.id,
      checkoutUrl: ownPending.checkoutUrl,
      queued: false
    });
  }

  const live = await prisma.payment.findFirst({
    where: { provider: "YOUPI", status: "PENDING" },
    select: { id: true }
  });

  const queuedCount = await prisma.payment.count({
    where: { provider: "YOUPI", status: "QUEUED" }
  });

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      currency: "INR",
      status: live ? "QUEUED" : "PENDING",
      provider: "YOUPI",
      tier,
      periodMonths: months,
      queuePosition: live ? queuedCount + 1 : null,
      expiresAt: new Date(Date.now() + 45 * 60_000)
    }
  });

  if (live) {
    return NextResponse.json({
      id: payment.id,
      queued: true,
      position: queuedCount + 1,
      message: "Another payment is in progress. Please wait. You are in the queue."
    });
  }

  try {
    const remote = await youpiCreatePayment({
      orderId: payment.id,
      amountPaise: amount,
      returnUrl: absoluteUrl(`/dashboard/billing?payment=${payment.id}`),
      idempotencyKey: payment.id
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: remote.paymentId || undefined,
        providerOrderId: remote.orderId || payment.id,
        checkoutUrl: remote.checkoutUrl || undefined
      }
    });
    return NextResponse.json({
      id: payment.id,
      queued: false,
      checkoutUrl: remote.checkoutUrl || null
    });
  } catch (e: any) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" }
    });
    return NextResponse.json({ error: e.message || "Could not start payment" }, { status: 502 });
  }
}

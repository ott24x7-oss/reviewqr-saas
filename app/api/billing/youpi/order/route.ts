import { NextRequest, NextResponse } from "next/server";
import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { getYoupiConfig, youpiConfigured, youpiCreatePayment } from "@/lib/payments/youpi";
import { DURATIONS } from "@/lib/plans/catalog";
import { quotePlanCheckout, scheduleDowngrade } from "@/lib/plans/checkout";
import { legacyPlanId } from "@/lib/plans/legacy";
import { activateCompletedPayment } from "@/lib/subscription";
import { shopStubHonoured } from "@/lib/shop/payment-stub";

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

  const body = (await req.json().catch(() => ({}))) as {
    tier?: string;
    months?: number;
    planSlug?: string;
    duration?: string;
  };
  let slug = String(body.planSlug || "").trim().toLowerCase();
  let duration = String(body.duration || "") as PlanDuration;
  let tier = String(body.tier || "").toUpperCase() as SubscriptionTier;
  let months = Number(body.months) === 12 ? 12 : 1;
  // The old tier checkout goes through the same catalogue quote as a plan,
  // so renewal, upgrade and downgrade rules are the same for everyone.
  if (!slug) {
    if (!["STARTER", "GROWTH", "AGENCY"].includes(tier)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    const legacy = await prisma.plan.findUnique({ where: { id: legacyPlanId(tier) }, select: { slug: true } });
    if (!legacy) return NextResponse.json({ error: "Choose a plan on the Plans page" }, { status: 400 });
    slug = legacy.slug;
    duration = months >= 12 ? "YEAR_1" : "MONTH_1";
  }
  let amount = 0;
  let planFields: {
    planId: string;
    duration: PlanDuration;
    modules: string[];
    limits: unknown;
    creditPaise: number;
  } | null = null;

  if (slug) {
    if (!DURATIONS.includes(duration)) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }
    const quoted = await quotePlanCheckout(user.id, slug, duration);
    if (!quoted.ok) return NextResponse.json({ error: quoted.error }, { status: 400 });
    if (quoted.quote.kind === "downgrade") {
      const scheduled = await scheduleDowngrade(user.id, quoted);
      if (!scheduled.ok) return NextResponse.json({ error: scheduled.error }, { status: 400 });
      return NextResponse.json({ scheduled: true, plan: quoted.name });
    }
    tier = quoted.tier;
    months = quoted.months;
    amount = quoted.quote.duePaise;
    planFields = {
      planId: quoted.planId,
      duration: quoted.duration,
      modules: quoted.modules,
      limits: quoted.limits,
      creditPaise: quoted.quote.creditPaise
    };
  }

  if (amount <= 0 && planFields) {
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 0,
        currency: "INR",
        status: "PENDING",
        provider: "YOUPI",
        tier,
        periodMonths: months,
        planId: planFields.planId,
        duration: planFields.duration,
        modules: planFields.modules,
        limits: planFields.limits as object,
        creditPaise: planFields.creditPaise,
        verifiedVia: "credit"
      }
    });
    const activated = await activateCompletedPayment({
      paymentId: payment.id,
      verifiedVia: "credit",
      expectedAmountPaise: 0,
      expectedOrderId: payment.id
    });
    if (!activated.ok) return NextResponse.json({ error: activated.error }, { status: 409 });
    return NextResponse.json({ id: payment.id, activated: true, checkoutUrl: null });
  }

  const ownPending = await prisma.payment.findFirst({
    where: {
      userId: user.id,
      provider: "YOUPI",
      status: "PENDING",
      amount,
      planId: planFields?.planId ?? null,
      duration: planFields?.duration ?? null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    orderBy: { createdAt: "desc" }
  });
  if (ownPending?.checkoutUrl) {
    return NextResponse.json({
      id: ownPending.id,
      checkoutUrl: ownPending.checkoutUrl,
      queued: false
    });
  }

  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      amount,
      currency: "INR",
      status: "PENDING",
      provider: "YOUPI",
      tier,
      periodMonths: months,
      ...(planFields
        ? {
            planId: planFields.planId,
            duration: planFields.duration,
            modules: planFields.modules,
            limits: planFields.limits as object,
            creditPaise: planFields.creditPaise
          }
        : {}),
      expiresAt: new Date(Date.now() + 45 * 60_000)
    }
  });

  if (shopStubHonoured()) {
    const activated = await activateCompletedPayment({
      paymentId: payment.id,
      verifiedVia: "stub",
      expectedAmountPaise: amount,
      expectedOrderId: payment.id
    });
    if (!activated.ok) return NextResponse.json({ error: activated.error }, { status: 409 });
    return NextResponse.json({ id: payment.id, activated: true, checkoutUrl: null });
  }

  // YouPI serves one payment per VPA and queues the rest on its own checkout
  // page, so always create the session and pass its queue position through.
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
        checkoutUrl: remote.checkoutUrl || undefined,
        queuePosition: remote.queuePosition || null
      }
    });
    const queued = String(remote.status || "").toUpperCase() === "QUEUED";
    return NextResponse.json({
      id: payment.id,
      queued,
      position: queued ? remote.queuePosition ?? null : null,
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

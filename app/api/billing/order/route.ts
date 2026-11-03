import { NextRequest, NextResponse } from "next/server";
import type { PlanDuration, SubscriptionTier } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPaymentsConfig } from "@/lib/settings";
import { createOrder, type ManualPlanFields, type PayMethod } from "@/lib/manual-payments";
import { DURATIONS } from "@/lib/plans/catalog";
import { quotePlanCheckout, scheduleDowngrade } from "@/lib/plans/checkout";
import { activateCompletedPayment } from "@/lib/subscription";
import QRCode from "qrcode";

/** Create a pending own UPI/USDT order and return the pay-to details. */
export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    tier?: string;
    months?: number;
    method?: string;
    planSlug?: string;
    duration?: string;
  };
  const tier = String(body.tier || "").toUpperCase() as SubscriptionTier;
  const months = Number(body.months) === 12 ? 12 : 1;
  const method = (body.method === "usdt" ? "usdt" : "upi") as PayMethod;
  const planSlug = String(body.planSlug || "").trim().toLowerCase();
  const cfg = await getPaymentsConfig();

  if (method === "upi" && (cfg.upiGateway !== "manual" || !cfg.upiEnabled || !cfg.upiId)) {
    return NextResponse.json({ error: "UPI payments are not available right now." }, { status: 400 });
  }
  if (method === "usdt" && (!cfg.usdtEnabled || !cfg.usdtAddress)) {
    return NextResponse.json({ error: "USDT payments are not available right now." }, { status: 400 });
  }

  let planFields: ManualPlanFields | undefined;
  let planTier = tier;
  let planMonths = months;
  if (planSlug) {
    const duration = String(body.duration || "") as PlanDuration;
    if (!DURATIONS.includes(duration)) {
      return NextResponse.json({ error: "Invalid plan duration" }, { status: 400 });
    }
    const quote = await quotePlanCheckout(user.id, planSlug, duration);
    if (!quote.ok) return NextResponse.json({ error: quote.error }, { status: 400 });
    if (quote.quote.kind === "downgrade") {
      const scheduled = await scheduleDowngrade(user.id, quote);
      if (!scheduled.ok) return NextResponse.json({ error: scheduled.error }, { status: 400 });
      return NextResponse.json({ scheduled: true, plan: quote.name });
    }
    planTier = quote.tier;
    planMonths = quote.months;
    planFields = {
      amountPaise: quote.quote.duePaise,
      planId: quote.planId,
      duration: quote.duration,
      modules: quote.modules,
      limits: quote.limits,
      creditPaise: quote.quote.creditPaise
    };
  } else if (!["STARTER", "GROWTH", "AGENCY"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (planFields && planFields.amountPaise <= 0) {
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: 0,
        currency: "INR",
        status: "PENDING",
        provider: method === "usdt" ? "USDT" : "UPI",
        method,
        tier: planTier,
        periodMonths: planMonths,
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

  try {
    const order = await createOrder(user.id, planTier, planMonths, method, planFields);
    const rupees = (order.amount / 100).toFixed(2);
    const upiLink =
      method === "upi"
        ? `upi://pay?pa=${encodeURIComponent(cfg.upiId)}&pn=${encodeURIComponent(
            cfg.upiPayeeName || "QR24x7"
          )}&am=${rupees}&cu=INR&tn=${encodeURIComponent("QR24x7 " + order.id.slice(-8))}`
        : null;
    const upiQr = upiLink ? await QRCode.toDataURL(upiLink, { margin: 1, width: 320, errorCorrectionLevel: "M" }) : null;

    return NextResponse.json({
      id: order.id,
      method,
      tier: planTier,
      months: planMonths,
      amountInr: order.amount,
      amountInrDisplay: rupees,
      amountUsdt: order.amountUsdt,
      expiresAt: order.expiresAt,
      upi: method === "upi" ? { id: cfg.upiId, payee: cfg.upiPayeeName, qr: upiQr, link: upiLink } : null,
      usdt: method === "usdt" ? { address: cfg.usdtAddress, network: cfg.usdtNetwork } : null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create order" }, { status: 400 });
  }
}

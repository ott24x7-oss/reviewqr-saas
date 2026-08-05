/**
 * Manual payment collection (UPI INR / USDT) with email-based auto-verification.
 *
 * Flow: create a PENDING Payment with a UNIQUE amount (base plan price + a random
 * paise/cent suffix) so bank/exchange confirmation emails can be matched without
 * ambiguity. The reconciler reads the inbox, matches amount (+ optional reference)
 * and activates the subscription.
 */
import { prisma } from "./db";
import { getPaymentsConfig, getPricingConfig } from "./settings";
import { fetchRecentPaymentEmails, type ParsedEmail } from "./email-verify";
import type { Payment, SubscriptionTier } from "@prisma/client";

export type PayMethod = "upi" | "usdt";

const ORDER_TTL_MIN = 45;

/** Create a pending order with a unique matchable amount. */
export async function createOrder(
  userId: string,
  tier: SubscriptionTier,
  months: number,
  method: PayMethod
): Promise<Payment> {
  const plans = await getPricingConfig();
  const plan = plans[tier];
  if (!plan) throw new Error("Unknown plan");
  const base = months >= 12 ? plan.yearly : plan.monthly; // paise
  if (base <= 0) throw new Error("This plan is free");

  // Unique 1–98 paise suffix so each pending INR amount is distinct for matching.
  const suffix = 1 + Math.floor(Math.random() * 98);
  const amount = base - (base % 100) + suffix; // e.g. 99900 -> 99937 (= ₹999.37)

  const cfg = await getPaymentsConfig();
  let amountUsdt: number | null = null;
  let network: string | null = null;
  if (method === "usdt") {
    const inr = amount / 100;
    const rate = cfg.usdtRateInr > 0 ? cfg.usdtRateInr : 90;
    // Unique cents suffix on the USDT amount too.
    amountUsdt = Math.round((inr / rate) * 100) / 100 + (1 + Math.floor(Math.random() * 89)) / 100;
    amountUsdt = Math.round(amountUsdt * 100) / 100;
    network = cfg.usdtNetwork || "TRC20";
  }

  return prisma.payment.create({
    data: {
      userId,
      amount,
      currency: "INR",
      status: "PENDING",
      provider: method === "usdt" ? "USDT" : "UPI",
      method,
      tier,
      periodMonths: months,
      amountUsdt,
      network,
      expiresAt: new Date(Date.now() + ORDER_TTL_MIN * 60_000)
    }
  });
}

/** Attach the customer-entered UTR / tx-hash to a pending order. */
export async function attachReference(paymentId: string, userId: string, reference: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, userId, status: "PENDING" },
    data: { reference: reference.trim().slice(0, 120) }
  });
}

/** Does an email confirm this payment? Match on the unique amount, then reference. */
function matchEmail(payment: Payment, emails: ParsedEmail[]): ParsedEmail | null {
  const ref = (payment.reference || "").toLowerCase().replace(/\s+/g, "");
  if (payment.method === "usdt") {
    const usdt = (payment.amountUsdt || 0).toFixed(2);
    for (const e of emails) {
      const body = (e.subject + " " + e.text).toLowerCase();
      const amountHit =
        body.includes(usdt) &&
        (body.includes("usdt") || body.includes("tether") || body.includes("deposit"));
      const refHit = ref.length >= 6 && body.replace(/\s+/g, "").includes(ref);
      if (amountHit || refHit) return e;
    }
    return null;
  }
  // UPI (INR)
  const rupees = (payment.amount / 100).toFixed(2); // "999.37"
  const rupeesWhole = Math.round(payment.amount / 100).toString();
  for (const e of emails) {
    const body = (e.subject + " " + e.text).toLowerCase().replace(/,/g, "");
    const amountHit =
      body.includes(rupees) ||
      body.includes("rs " + rupees) ||
      body.includes("rs." + rupees) ||
      body.includes("inr " + rupees) ||
      body.includes("₹" + rupees);
    const refHit = ref.length >= 8 && body.replace(/\s+/g, "").includes(ref);
    if (amountHit || (refHit && body.includes(rupeesWhole))) return e;
  }
  return null;
}

async function activate(payment: Payment, via: string, matchedEmail: string | null) {
  const months = payment.periodMonths || 1;
  const ends = new Date(Date.now() + months * 30 * 86_400_000);
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "COMPLETED", verifiedVia: via, matchedEmail: matchedEmail?.slice(0, 200) || null }
    }),
    prisma.user.update({
      where: { id: payment.userId },
      data: {
        subscriptionTier: payment.tier,
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: ends
      }
    })
  ]);
}

/** Try to verify a single pending order against the inbox. Returns true if activated. */
export async function reconcilePayment(payment: Payment): Promise<boolean> {
  if (payment.status !== "PENDING") return payment.status === "COMPLETED";
  const cfg = await getPaymentsConfig();
  if (!cfg.mailVerifyEnabled || !cfg.mailImapUser) return false;
  const emails = await fetchRecentPaymentEmails(
    {
      host: cfg.mailImapHost,
      port: cfg.mailImapPort,
      user: cfg.mailImapUser,
      pass: cfg.mailImapPass,
      fromFilter: cfg.mailFromFilter
    },
    1440
  );
  const hit = matchEmail(payment, emails);
  if (hit) {
    await activate(payment, "email", `${hit.uid} ${hit.subject}`);
    return true;
  }
  return false;
}

/** Reconcile all non-expired pending orders in one inbox pass (for cron). */
export async function reconcileAllPending(): Promise<{ checked: number; activated: number }> {
  const cfg = await getPaymentsConfig();
  if (!cfg.mailVerifyEnabled || !cfg.mailImapUser) return { checked: 0, activated: 0 };
  const pending = await prisma.payment.findMany({
    where: { status: "PENDING", method: { in: ["upi", "usdt"] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  if (pending.length === 0) return { checked: 0, activated: 0 };
  const emails = await fetchRecentPaymentEmails(
    {
      host: cfg.mailImapHost,
      port: cfg.mailImapPort,
      user: cfg.mailImapUser,
      pass: cfg.mailImapPass,
      fromFilter: cfg.mailFromFilter
    },
    1440
  );
  let activated = 0;
  for (const p of pending) {
    const hit = matchEmail(p, emails);
    if (hit) {
      await activate(p, "email", `${hit.uid} ${hit.subject}`);
      activated++;
    }
  }
  return { checked: pending.length, activated };
}

/** Admin force-activation (manual confirmation). */
export async function activateManually(paymentId: string): Promise<boolean> {
  const p = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!p || p.status === "COMPLETED") return false;
  await activate(p, "manual", null);
  return true;
}

/** Expire stale pending orders (best-effort housekeeping). */
export async function expireStale(): Promise<number> {
  const r = await prisma.payment.updateMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "FAILED" }
  });
  return r.count;
}

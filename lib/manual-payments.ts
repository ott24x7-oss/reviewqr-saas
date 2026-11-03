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
import { activateCompletedPayment } from "./subscription";
import { matchBankCredit } from "./bank-credit-ledger";
import { syncIncomingBankCredits } from "./bank-credit-sync";
import { Prisma, type Payment, type SubscriptionTier } from "@prisma/client";

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

  const cfg = await getPaymentsConfig();
  const createData = (amount: number, amountUsdt: number | null, network: string | null): Prisma.PaymentUncheckedCreateInput => ({
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
      expiresAt: new Date(Date.now() + (method === "upi" ? 15 : ORDER_TTL_MIN) * 60_000)
  });
  if (method === "upi") {
    // Keep amount selection and insert under one advisory lock, so concurrent
    // checkouts sharing a base price choose separate paise values.
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(2407, 19)`;
      const floor = base - (base % 100);
      const occupied = await tx.payment.findMany({
        // Keep each paise suffix reserved throughout the same 24h grace window
        // used by matching, so a delayed alert cannot collide with a new order.
        where: { status: "PENDING", method: "upi", expiresAt: { gt: new Date(Date.now() - 24 * 60 * 60_000) }, amount: { gte: floor + 1, lte: floor + 98 } },
        select: { amount: true }
      });
      const used = new Set(occupied.map((payment) => payment.amount));
      const first = 1 + Math.floor(Math.random() * 98);
      let selected: number | null = null;
      for (let offset = 0; offset < 98; offset++) {
        const suffix = ((first - 1 + offset) % 98) + 1;
        const candidate = floor + suffix;
        if (!used.has(candidate)) { selected = candidate; break; }
      }
      if (selected == null) throw new Error("No unique UPI amount is available right now. Try again shortly.");
      return tx.payment.create({ data: createData(selected, null, null) });
    });
  }
  const amount = base - (base % 100) + 1 + Math.floor(Math.random() * 98);
  const inr = amount / 100;
  const rate = cfg.usdtRateInr > 0 ? cfg.usdtRateInr : 90;
  const amountUsdt = Math.round((inr / rate) * 100) / 100 + (1 + Math.floor(Math.random() * 89)) / 100;
  return prisma.payment.create({ data: createData(amount, Math.round(amountUsdt * 100) / 100, cfg.usdtNetwork || "TRC20") });
}

/** Attach the customer-entered UTR / tx-hash to a pending order. */
export async function attachReference(paymentId: string, userId: string, reference: string) {
  await prisma.payment.updateMany({
    where: { id: paymentId, userId, status: "PENDING" },
    data: { reference: reference.trim().slice(0, 120) }
  });
}

/**
 * Does an email confirm this payment?
 *
 * Security: a confirmation is only accepted when the email contains BOTH the
 * exact unique amount AND the customer-supplied transaction reference (UTR /
 * tx-hash). Neither signal alone is trusted:
 *  - amount alone collides across users sharing the same tier/period and can be
 *    forged by anyone who can email the mailbox;
 *  - reference alone proves nothing about funds actually being received.
 * The email must also have already passed the sender allow-list upstream
 * (fetchRecentPaymentEmails), so `from` is a known payment provider.
 * A reference must be present — orders with no reference never auto-activate.
 */
function matchEmail(payment: Payment, emails: ParsedEmail[]): ParsedEmail | null {
  const ref = (payment.reference || "").toLowerCase().replace(/\s+/g, "");
  // No reference on file → nothing to bind against; refuse to auto-verify.
  if (ref.length < 6) return null;

  if (payment.method === "usdt") {
    const usdt = (payment.amountUsdt || 0).toFixed(2);
    for (const e of emails) {
      const raw = (e.subject + " " + e.text).toLowerCase();
      const compact = raw.replace(/\s+/g, "");
      const amountHit =
        raw.includes(usdt) &&
        (raw.includes("usdt") || raw.includes("tether") || raw.includes("deposit"));
      const refHit = compact.includes(ref);
      if (amountHit && refHit) return e;
    }
    return null;
  }

  // UPI (INR): require the exact rupee amount AND the reference in the same email.
  const rupees = (payment.amount / 100).toFixed(2); // "999.37"
  for (const e of emails) {
    const raw = (e.subject + " " + e.text).toLowerCase().replace(/,/g, "");
    const compact = raw.replace(/\s+/g, "");
    const amountHit =
      raw.includes(rupees) ||
      raw.includes("rs " + rupees) ||
      raw.includes("rs." + rupees) ||
      raw.includes("inr " + rupees) ||
      raw.includes("₹" + rupees);
    const refHit = compact.includes(ref);
    if (amountHit && refHit) return e;
  }
  return null;
}

/**
 * Has this confirmation email already been used to activate another order?
 * Prevents a single provider email from activating many colliding orders
 * (e.g. an attacker who pre-created orders across every amount suffix).
 */
async function emailAlreadyUsed(messageId: string): Promise<boolean> {
  if (!messageId) return false;
  const existing = await prisma.payment.findFirst({
    where: { status: "COMPLETED", matchedEmail: { contains: messageId } },
    select: { id: true }
  });
  return !!existing;
}

async function activate(payment: Payment, via: string, matchedEmail: string | null) {
  const result = await activateCompletedPayment({
    paymentId: payment.id,
    verifiedVia: via,
    matchedEmail,
    utr: payment.reference
  });
  if (!result.ok) throw new Error(result.error);
}

/** Try to verify a single pending order against the inbox. Returns true if activated. */
export async function reconcilePayment(payment: Payment): Promise<boolean> {
  if (payment.status !== "PENDING") return payment.status === "COMPLETED";
  if (payment.method === "upi") {
    const credits = await prisma.bankCredit.findMany({
      where: {
        paymentId: null,
        shopOrderId: null,
        amountPaise: payment.amount,
        receivedAt: { gt: new Date(payment.createdAt.getTime() - 3 * 60_000), lt: new Date((payment.expiresAt?.getTime() || Date.now()) + 24 * 60 * 60_000) },
        ...(payment.reference ? { utr: payment.reference.replace(/\D/g, "") } : {})
      },
      select: { id: true },
      take: 30
    });
    for (const credit of credits) if ((await matchBankCredit(credit.id)).matched) return true;
    return false;
  }
  const cfg = await getPaymentsConfig();
  if (!cfg.mailVerifyEnabled || !cfg.mailImapUser) return false;
  // Refuse to auto-verify without a sender allow-list (see matchEmail rationale).
  if (!cfg.mailFromFilter.trim()) return false;
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
  if (hit && !(await emailAlreadyUsed(hit.messageId))) {
    await activate(payment, "email", `${hit.messageId} :: ${hit.subject}`);
    return true;
  }
  return false;
}

/** Reconcile all non-expired pending orders in one inbox pass (for cron). */
export async function reconcileAllPending(): Promise<{ checked: number; activated: number }> {
  let bankChecked = 0;
  let bankActivated = 0;
  try {
    const sync = await syncIncomingBankCredits();
    bankChecked = sync.checked;
    bankActivated = sync.matched;
  } catch {
    // A failed inbox source must not prevent the separate legacy USDT path from running.
  }
  const cfg = await getPaymentsConfig();
  if (!cfg.mailVerifyEnabled || !cfg.mailImapUser) return { checked: bankChecked, activated: bankActivated };
  // Refuse to auto-verify without a sender allow-list (see matchEmail rationale).
  if (!cfg.mailFromFilter.trim()) return { checked: 0, activated: 0 };
  const pending = await prisma.payment.findMany({
    where: { status: "PENDING", method: "usdt", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  if (pending.length === 0) return { checked: bankChecked, activated: bankActivated };
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
  let activated = bankActivated;
  const usedInBatch = new Set<string>();
  for (const p of pending) {
    const hit = matchEmail(p, emails);
    if (!hit) continue;
    // One email activates at most one order — within this batch and across history.
    if (usedInBatch.has(hit.messageId)) continue;
    if (await emailAlreadyUsed(hit.messageId)) continue;
    usedInBatch.add(hit.messageId);
    await activate(p, "email", `${hit.messageId} :: ${hit.subject}`);
    activated++;
  }
  return { checked: pending.length + bankChecked, activated };
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
  const now = new Date();
  const [upi, other] = await Promise.all([
    // Keep a UPI order eligible for delayed bank alerts through its matching grace window.
    prisma.payment.updateMany({
      where: { status: "PENDING", method: "upi", expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) } },
      data: { status: "FAILED" }
    }),
    prisma.payment.updateMany({
      where: { status: "PENDING", method: { not: "upi" }, expiresAt: { lt: now } },
      data: { status: "FAILED" }
    })
  ]);
  return upi.count + other.count;
}

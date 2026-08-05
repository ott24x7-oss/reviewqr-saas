/**
 * Payments helper. Reads keys + plans from AppSetting (admin-editable),
 * with env vars as fallback.
 */
import Razorpay from "razorpay";
import crypto from "crypto";
import type { SubscriptionTier, SubscriptionStatus } from "@prisma/client";
import {
  getPaymentsConfig,
  getPricingConfig,
  DEFAULT_PLANS,
  type PlanInfo as SettingsPlanInfo
} from "./settings";

export type PlanInfo = SettingsPlanInfo;

/**
 * Synchronous fallback PLANS object — used by callers that haven't been
 * converted to async (notably the marketing page). Kept in sync with
 * DEFAULT_PLANS in lib/settings.ts. For server callers, prefer getPlans().
 */
export const PLANS: Record<SubscriptionTier, PlanInfo> = DEFAULT_PLANS;

/**
 * Compute the EFFECTIVE subscription tier for gating/access control.
 *
 * The stored `subscriptionTier` reflects what the user paid for, but access
 * must also account for trial/paid-period expiry and cancellation. This
 * returns FREE whenever access should be revoked, otherwise the real tier.
 * Use this (never the raw `subscriptionTier`) for any limit/feature gate.
 */
export function effectiveTier(u: {
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  subscriptionEndsAt: Date | null;
}): SubscriptionTier {
  const now = new Date();

  // Already free — nothing to revoke.
  if (u.subscriptionTier === "FREE") return "FREE";

  // Explicitly cancelled or expired.
  if (u.subscriptionStatus === "CANCELED" || u.subscriptionStatus === "EXPIRED") {
    return "FREE";
  }

  // Paid period has lapsed.
  if (u.subscriptionEndsAt && u.subscriptionEndsAt.getTime() < now.getTime()) {
    return "FREE";
  }

  // Trial ended with no paid period taking over.
  if (
    u.subscriptionStatus === "TRIALING" &&
    u.trialEndsAt &&
    u.trialEndsAt.getTime() < now.getTime()
  ) {
    return "FREE";
  }

  return u.subscriptionTier;
}

export async function getPlans() {
  return getPricingConfig();
}

export async function getPlan(tier: SubscriptionTier) {
  const plans = await getPricingConfig();
  return plans[tier];
}

export async function getRazorpay() {
  const cfg = await getPaymentsConfig();
  if (!cfg.razorpayKeyId || !cfg.razorpayKeySecret) {
    throw new Error("Razorpay not configured. Set keys in Admin → Payments.");
  }
  return new Razorpay({ key_id: cfg.razorpayKeyId, key_secret: cfg.razorpayKeySecret });
}

export async function isRazorpayConfigured() {
  const cfg = await getPaymentsConfig();
  return !!(cfg.razorpayKeyId && cfg.razorpayKeySecret);
}

export async function createRazorpayOrder(opts: {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const rzp = await getRazorpay();
  return rzp.orders.create({
    amount: opts.amount,
    currency: "INR",
    receipt: opts.receipt,
    notes: opts.notes
  });
}

export async function verifyRazorpaySignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const cfg = await getPaymentsConfig();
  const expected = crypto
    .createHmac("sha256", cfg.razorpayKeySecret)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opts.signature));
}

export async function verifyRazorpayWebhook(rawBody: string, signature: string) {
  const cfg = await getPaymentsConfig();
  if (!cfg.razorpayWebhookSecret) return false;
  const expected = crypto
    .createHmac("sha256", cfg.razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function getUpiPaymentLink(opts: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: opts.upiId,
    pn: opts.payeeName,
    am: (opts.amount / 100).toFixed(2),
    cu: "INR",
    tn: opts.note
  });
  return `upi://pay?${params.toString()}`;
}

export async function planPriceForPeriod(
  tier: SubscriptionTier,
  period: "monthly" | "yearly"
) {
  const plan = await getPlan(tier);
  return plan[period];
}

export async function planLimit(tier: SubscriptionTier, key: keyof PlanInfo["limits"]) {
  const plan = await getPlan(tier);
  return plan.limits[key];
}

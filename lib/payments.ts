/**
 * Payments helper. Supports:
 *  - Razorpay (primary, Indian)
 *  - Stripe (international fallback)
 *  - UPI manual (UTR submission, like wa-Invoice-bot)
 *
 * Plans pricing is monthly/yearly INR. The seed sets defaults; admin
 * can customise via the dashboard.
 */
import Razorpay from "razorpay";
import crypto from "crypto";
import type { SubscriptionTier } from "@prisma/client";

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

export type PlanInfo = {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthly: number; // paise
  yearly: number; // paise
  features: string[];
  highlighted?: boolean;
  limits: {
    businesses: number;
    locations: number;
    staff: number;
    qrCodes: number;
    reviews: number; // per month
  };
};

export const PLANS: Record<SubscriptionTier, PlanInfo> = {
  FREE: {
    tier: "FREE",
    name: "Free",
    tagline: "Try ReviewQR risk-free",
    monthly: 0,
    yearly: 0,
    features: [
      "1 business",
      "1 location",
      "Smart review link",
      "Basic QR code",
      "Up to 50 reviews/month"
    ],
    limits: { businesses: 1, locations: 1, staff: 1, qrCodes: 2, reviews: 50 }
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    tagline: "For single-location shops",
    monthly: 49900, // ₹499
    yearly: 499900, // ₹4,999 (save ~17%)
    features: [
      "1 business, 1 location",
      "Unlimited QR codes",
      "WhatsApp follow-ups",
      "Negative feedback alerts",
      "CSV export",
      "Email reports"
    ],
    limits: { businesses: 1, locations: 1, staff: 5, qrCodes: 50, reviews: 1000 }
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Growth",
    tagline: "For multi-location SMBs",
    monthly: 99900, // ₹999
    yearly: 999900, // ₹9,999 (save ~17%)
    features: [
      "5 businesses, 25 locations",
      "Staff-wise review tracking",
      "Campaign tracking",
      "PDF monthly reports",
      "Custom branding",
      "Public testimonial widget",
      "Priority support"
    ],
    highlighted: true,
    limits: { businesses: 5, locations: 25, staff: 100, qrCodes: 500, reviews: 10000 }
  },
  AGENCY: {
    tier: "AGENCY",
    name: "Agency",
    tagline: "White-label for agencies",
    monthly: 299900, // ₹2,999
    yearly: 2999900, // ₹29,999
    features: [
      "Unlimited businesses",
      "White-label dashboard",
      "Custom domain",
      "Sub-account management",
      "API access",
      "Dedicated success manager"
    ],
    limits: {
      businesses: 10000,
      locations: 100000,
      staff: 100000,
      qrCodes: 100000,
      reviews: 1000000
    }
  }
};

export function getRazorpay() {
  if (!RZP_KEY_ID || !RZP_KEY_SECRET) {
    throw new Error("Razorpay not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }
  return new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET });
}

export function isRazorpayConfigured() {
  return !!(RZP_KEY_ID && RZP_KEY_SECRET);
}

export async function createRazorpayOrder(opts: {
  amount: number; // paise
  receipt: string;
  notes?: Record<string, string>;
}) {
  const rzp = getRazorpay();
  return rzp.orders.create({
    amount: opts.amount,
    currency: "INR",
    receipt: opts.receipt,
    notes: opts.notes
  });
}

export function verifyRazorpaySignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const expected = crypto
    .createHmac("sha256", RZP_KEY_SECRET)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(opts.signature));
}

export function verifyRazorpayWebhook(rawBody: string, signature: string) {
  if (!RZP_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", RZP_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function getUpiPaymentLink(opts: {
  upiId: string;
  payeeName: string;
  amount: number; // paise
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

export function planPriceForPeriod(tier: SubscriptionTier, period: "monthly" | "yearly") {
  return PLANS[tier][period];
}

export function planLimit(tier: SubscriptionTier, key: keyof PlanInfo["limits"]) {
  return PLANS[tier].limits[key];
}

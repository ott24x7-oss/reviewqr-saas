/**
 * App settings: admin-editable config stored in the AppSetting table.
 * Each entry holds JSON. We cache reads in-memory for 30s so the
 * hot paths (email send, payment create, plan lookup) don't hammer DB.
 */
import { prisma } from "./db";
import type { SubscriptionTier } from "@prisma/client";

const TTL_MS = 30_000;
const cache = new Map<string, { value: any; expiresAt: number }>();

export const SETTING_KEYS = {
  payments: "payments",
  pricing: "pricing.plans",
  email: "email",
  whatsapp: "whatsapp",
  site: "site",
  turnstile: "turnstile"
} as const;

export type PaymentsConfig = {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  razorpayLive: boolean;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey: string;
  upiId: string;
  upiPayeeName: string;
};

export type EmailConfig = {
  relayUrl: string;
  relaySecret: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
};

export type WhatsAppConfig = {
  apiUrl: string;
  apiToken: string;
  phoneId: string;
};

export type SiteConfig = {
  appName: string;
  supportEmail: string;
  appUrl: string;
  marketingTagline: string;
  signupsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

export type TurnstileConfig = {
  siteKey: string;
  secretKey: string;
};

export type PlanInfo = {
  tier: SubscriptionTier;
  name: string;
  tagline: string;
  monthly: number; // paise
  yearly: number; // paise
  features: string[];
  highlighted?: boolean;
  visible: boolean;
  limits: {
    businesses: number;
    locations: number;
    staff: number;
    qrCodes: number;
    reviews: number;
  };
};

export type PricingConfig = Record<SubscriptionTier, PlanInfo>;

export const DEFAULT_PLANS: PricingConfig = {
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
    visible: true,
    limits: { businesses: 1, locations: 1, staff: 1, qrCodes: 2, reviews: 50 }
  },
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    tagline: "For single-location shops",
    monthly: 49900,
    yearly: 499900,
    features: [
      "1 business, 1 location",
      "Unlimited QR codes",
      "WhatsApp follow-ups",
      "Negative feedback alerts",
      "CSV export",
      "Email reports"
    ],
    visible: true,
    limits: { businesses: 1, locations: 1, staff: 5, qrCodes: 50, reviews: 1000 }
  },
  GROWTH: {
    tier: "GROWTH",
    name: "Growth",
    tagline: "For multi-location SMBs",
    monthly: 99900,
    yearly: 999900,
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
    visible: true,
    limits: { businesses: 5, locations: 25, staff: 100, qrCodes: 500, reviews: 10000 }
  },
  AGENCY: {
    tier: "AGENCY",
    name: "Agency",
    tagline: "White-label for agencies",
    monthly: 299900,
    yearly: 2999900,
    features: [
      "Unlimited businesses",
      "White-label dashboard",
      "Custom domain",
      "Sub-account management",
      "API access",
      "Dedicated success manager"
    ],
    visible: true,
    limits: {
      businesses: 10000,
      locations: 100000,
      staff: 100000,
      qrCodes: 100000,
      reviews: 1000000
    }
  }
};

export const DEFAULT_PAYMENTS: PaymentsConfig = {
  razorpayKeyId: "",
  razorpayKeySecret: "",
  razorpayWebhookSecret: "",
  razorpayLive: false,
  stripeSecretKey: "",
  stripeWebhookSecret: "",
  stripePublishableKey: "",
  upiId: "",
  upiPayeeName: "ReviewQR"
};

export const DEFAULT_EMAIL: EmailConfig = {
  relayUrl: "",
  relaySecret: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "ReviewQR <noreply@reviewqr.in>"
};

export const DEFAULT_WHATSAPP: WhatsAppConfig = {
  apiUrl: "https://graph.facebook.com/v20.0",
  apiToken: "",
  phoneId: ""
};

export const DEFAULT_SITE: SiteConfig = {
  appName: "ReviewQR",
  supportEmail: "hello@reviewqr.in",
  appUrl: "",
  marketingTagline: "Turn happy customers into Google reviews.",
  signupsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "We'll be back shortly."
};

export const DEFAULT_TURNSTILE: TurnstileConfig = { siteKey: "", secretKey: "" };

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    const value = row ? (JSON.parse(row.value) as T) : fallback;
    cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
    return value;
  } catch {
    return fallback;
  }
}

export function invalidateSettingsCache(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

async function writeKey(key: string, value: unknown, updatedBy?: string) {
  const json = JSON.stringify(value);
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: json, updatedBy: updatedBy || null },
    update: { value: json, updatedBy: updatedBy || null }
  });
  invalidateSettingsCache(key);
}

/* ============== Payments ============== */
export async function getPaymentsConfig(): Promise<PaymentsConfig> {
  const stored = await readKey<Partial<PaymentsConfig>>(SETTING_KEYS.payments, {});
  return {
    razorpayKeyId: stored.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "",
    razorpayKeySecret: stored.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "",
    razorpayWebhookSecret:
      stored.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "",
    razorpayLive: stored.razorpayLive ?? false,
    stripeSecretKey: stored.stripeSecretKey || process.env.STRIPE_SECRET_KEY || "",
    stripeWebhookSecret: stored.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "",
    stripePublishableKey:
      stored.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    upiId: stored.upiId || "",
    upiPayeeName: stored.upiPayeeName || DEFAULT_PAYMENTS.upiPayeeName
  };
}
export async function setPaymentsConfig(v: PaymentsConfig, by?: string) {
  await writeKey(SETTING_KEYS.payments, v, by);
}

/* ============== Pricing ============== */
export async function getPricingConfig(): Promise<PricingConfig> {
  const stored = await readKey<Partial<PricingConfig>>(SETTING_KEYS.pricing, {});
  return {
    FREE: { ...DEFAULT_PLANS.FREE, ...(stored.FREE || {}) },
    STARTER: { ...DEFAULT_PLANS.STARTER, ...(stored.STARTER || {}) },
    GROWTH: { ...DEFAULT_PLANS.GROWTH, ...(stored.GROWTH || {}) },
    AGENCY: { ...DEFAULT_PLANS.AGENCY, ...(stored.AGENCY || {}) }
  };
}
export async function setPricingConfig(v: PricingConfig, by?: string) {
  await writeKey(SETTING_KEYS.pricing, v, by);
}

/* ============== Email ============== */
export async function getEmailConfig(): Promise<EmailConfig> {
  const stored = await readKey<Partial<EmailConfig>>(SETTING_KEYS.email, {});
  return {
    relayUrl: stored.relayUrl || process.env.MAILER_RELAY_URL || "",
    relaySecret: stored.relaySecret || process.env.MAILER_SECRET || "",
    smtpHost: stored.smtpHost || process.env.SMTP_HOST || "",
    smtpPort: stored.smtpPort || Number(process.env.SMTP_PORT || 587),
    smtpUser: stored.smtpUser || process.env.SMTP_USER || "",
    smtpPass: stored.smtpPass || process.env.SMTP_PASS || "",
    smtpFrom:
      stored.smtpFrom ||
      process.env.SMTP_FROM ||
      `ReviewQR <${stored.smtpUser || process.env.SMTP_USER || "noreply@reviewqr.in"}>`
  };
}
export async function setEmailConfig(v: EmailConfig, by?: string) {
  await writeKey(SETTING_KEYS.email, v, by);
}

/* ============== WhatsApp ============== */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const stored = await readKey<Partial<WhatsAppConfig>>(SETTING_KEYS.whatsapp, {});
  return {
    apiUrl: stored.apiUrl || process.env.WHATSAPP_API_URL || DEFAULT_WHATSAPP.apiUrl,
    apiToken: stored.apiToken || process.env.WHATSAPP_API_TOKEN || "",
    phoneId: stored.phoneId || process.env.WHATSAPP_PHONE_ID || ""
  };
}
export async function setWhatsAppConfig(v: WhatsAppConfig, by?: string) {
  await writeKey(SETTING_KEYS.whatsapp, v, by);
}

/* ============== Site ============== */
export async function getSiteConfig(): Promise<SiteConfig> {
  const stored = await readKey<Partial<SiteConfig>>(SETTING_KEYS.site, {});
  return {
    appName: stored.appName || process.env.NEXT_PUBLIC_APP_NAME || DEFAULT_SITE.appName,
    supportEmail: stored.supportEmail || DEFAULT_SITE.supportEmail,
    appUrl: stored.appUrl || process.env.NEXT_PUBLIC_APP_URL || "",
    marketingTagline: stored.marketingTagline || DEFAULT_SITE.marketingTagline,
    signupsEnabled: stored.signupsEnabled ?? true,
    maintenanceMode: stored.maintenanceMode ?? false,
    maintenanceMessage: stored.maintenanceMessage || DEFAULT_SITE.maintenanceMessage
  };
}
export async function setSiteConfig(v: SiteConfig, by?: string) {
  await writeKey(SETTING_KEYS.site, v, by);
}

/* ============== Turnstile ============== */
export async function getTurnstileConfig(): Promise<TurnstileConfig> {
  const stored = await readKey<Partial<TurnstileConfig>>(SETTING_KEYS.turnstile, {});
  return {
    siteKey: stored.siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    secretKey: stored.secretKey || process.env.TURNSTILE_SECRET_KEY || ""
  };
}
export async function setTurnstileConfig(v: TurnstileConfig, by?: string) {
  await writeKey(SETTING_KEYS.turnstile, v, by);
}

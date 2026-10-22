/**
 * App settings: admin-editable config stored in the AppSetting table.
 * Each entry holds JSON. We cache reads in-memory for 30s so the
 * hot paths (email send, payment create, plan lookup) don't hammer DB.
 */
import { prisma } from "./db";
import type { SubscriptionTier } from "@prisma/client";
import { encryptSecret, decryptSecret } from "./crypto";
import {
  brandFromOrDefault,
  brandNameOrDefault,
  brandTaglineOrDefault,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  PREVIOUS_BRAND_NAME
} from "./brand-defaults";
import { BRAND_ICON } from "./brand-assets";
import { normalizeShopCheckout, shopCheckoutError, type ShopCheckoutConfig } from "./shop/charge";
import { DEFAULT_SHIPPING, pickupError, presetError, type ShippingConfig } from "./shop/shipping";

const TTL_MS = 30_000;
const cache = new Map<string, { value: any; expiresAt: number }>();

export const SETTING_KEYS = {
  payments: "payments",
  pricing: "pricing.plans",
  email: "email",
  whatsapp: "whatsapp",
  site: "site",
  turnstile: "turnstile",
  ai: "ai",
  shipping: "shipping",
  shop: "shop"
} as const;

// Which fields inside each settings blob are secrets encrypted at rest.
const SECRET_FIELDS: Record<string, string[]> = {
  [SETTING_KEYS.payments]: [
    "razorpayKeySecret",
    "razorpayWebhookSecret",
    "stripeSecretKey",
    "stripeWebhookSecret",
    "mailImapPass",
    "youpiWebhookSecret"
  ],
  [SETTING_KEYS.email]: ["relaySecret", "smtpPass"],
  [SETTING_KEYS.whatsapp]: ["apiToken"],
  [SETTING_KEYS.turnstile]: ["secretKey"],
  [SETTING_KEYS.ai]: ["apiKey"],
  [SETTING_KEYS.shipping]: ["shiprocketPassword", "delhiveryToken", "webhookSecret"]
};

function transformSecrets(
  key: string,
  obj: any,
  fn: (v: string) => string
): any {
  const fields = SECRET_FIELDS[key];
  if (!fields || !obj || typeof obj !== "object") return obj;
  for (const f of fields) {
    if (typeof obj[f] === "string" && obj[f]) obj[f] = fn(obj[f]);
  }
  return obj;
}

export type AiConfig = {
  enabled: boolean;
  /** OpenAI-compatible base URL, e.g. https://openrouter.ai/api/v1 */
  apiUrl: string;
  apiKey: string;
  /** Model id, e.g. openai/gpt-4o-mini (OpenRouter) or gpt-4o-mini (OpenAI) */
  model: string;
  /** Platform-wide estimated spend cap for one Indian calendar day, in paise. */
  dailyCapPaise: number;
  /** Paise added to the daily cap for each AI call. */
  estimatePaisePerCall: number;
};

export type PaymentsConfig = {
  // legacy (unused in UI, kept for back-compat)
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
  razorpayLive: boolean;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey: string;
  // UPI (INR)
  upiEnabled: boolean;
  upiId: string;
  upiPayeeName: string;
  upiQrDataUrl: string;
  // USDT (crypto)
  usdtEnabled: boolean;
  usdtNetwork: string; // e.g. TRC20 / BEP20
  usdtAddress: string;
  usdtRateInr: number; // 1 USDT = X INR (converts plan INR price → USDT)
  // Email auto-verify (IMAP)
  mailVerifyEnabled: boolean;
  mailImapHost: string;
  mailImapPort: number;
  mailImapUser: string;
  mailImapPass: string;
  mailFromFilter: string; // comma-separated sender substrings, e.g. "alerts@hdfcbank.net,noreply@binance.com"
  // YouPI (default checkout). Razorpay stays in the fields above and is off unless enabled by env.
  youpiBaseUrl: string;
  youpiMerchantId: string;
  youpiWebhookSecret: string;
  sellerLegalName: string;
  sellerGstin: string;
  sellerState: string;
  gstRate: number;
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

export type WhatsAppProvider = "click-to-chat" | "cloud-api" | "baileys";

export type WhatsAppConfig = {
  provider: WhatsAppProvider;
  apiUrl: string;
  apiToken: string;
  phoneId: string;
  notifyPositiveCopy: boolean;
};

export type SiteConfig = {
  appName: string;
  logoUrl: string;
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
    /** Monthly review cap across the owner's businesses. */
    reviews: number;
    aiCallsPerMonth: number;
    campaigns: number;
    reviewTemplates: number;
    /** Reserved for the store phase. High so it does not block that work. */
    storeProducts: number;
    storeOrders: number;
  };
};

export type PricingConfig = Record<SubscriptionTier, PlanInfo>;

export const DEFAULT_PLANS: PricingConfig = {
  FREE: {
    tier: "FREE",
    name: "Free",
    tagline: `Try ${DEFAULT_BRAND_NAME} risk-free`,
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
    limits: {
      businesses: 1,
      locations: 1,
      staff: 1,
      qrCodes: 2,
      reviews: 50,
      aiCallsPerMonth: 30,
      campaigns: 1,
      reviewTemplates: 10,
      storeProducts: 100000,
      storeOrders: 100000
    }
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
    limits: {
      businesses: 1,
      locations: 1,
      staff: 5,
      qrCodes: 50,
      reviews: 1000,
      aiCallsPerMonth: 300,
      campaigns: 10,
      reviewTemplates: 100,
      storeProducts: 100000,
      storeOrders: 100000
    }
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
    limits: {
      businesses: 5,
      locations: 25,
      staff: 100,
      qrCodes: 500,
      reviews: 10000,
      aiCallsPerMonth: 2000,
      campaigns: 50,
      reviewTemplates: 1000,
      storeProducts: 100000,
      storeOrders: 100000
    }
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
      "Dedicated success manager"
    ],
    visible: true,
    limits: {
      businesses: 10000,
      locations: 100000,
      staff: 100000,
      qrCodes: 100000,
      reviews: 1000000,
      aiCallsPerMonth: 100000,
      campaigns: 100000,
      reviewTemplates: 100000,
      storeProducts: 100000,
      storeOrders: 100000
    }
  },
  // Sold only as the capped catalogue SKU. Hidden from the public pricing page.
  FOUNDER: {
    tier: "FOUNDER",
    name: "Founder",
    tagline: "Lifetime access, limited quantity",
    monthly: 0,
    yearly: 0,
    features: [
      "5 businesses, 25 locations",
      "Staff-wise review tracking",
      "Campaign tracking",
      "PDF monthly reports",
      "Custom branding",
      "Does not lapse while active"
    ],
    visible: false,
    limits: {
      businesses: 5,
      locations: 25,
      staff: 100,
      qrCodes: 500,
      reviews: 10000,
      aiCallsPerMonth: 2000,
      campaigns: 50,
      reviewTemplates: 1000,
      storeProducts: 100000,
      storeOrders: 100000
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
  upiEnabled: false,
  upiId: "",
  upiPayeeName: DEFAULT_BRAND_NAME,
  upiQrDataUrl: "",
  usdtEnabled: false,
  usdtNetwork: "TRC20",
  usdtAddress: "",
  usdtRateInr: 90,
  mailVerifyEnabled: false,
  mailImapHost: "imap.gmail.com",
  mailImapPort: 993,
  mailImapUser: "",
  mailImapPass: "",
  mailFromFilter: "",
  youpiBaseUrl: "",
  youpiMerchantId: "",
  youpiWebhookSecret: "",
  sellerLegalName: DEFAULT_BRAND_NAME,
  sellerGstin: "",
  sellerState: "",
  gstRate: 18
};

export const DEFAULT_EMAIL: EmailConfig = {
  relayUrl: "",
  relaySecret: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: `${DEFAULT_BRAND_NAME} <noreply@qr24x7.in>`
};

export const DEFAULT_WHATSAPP: WhatsAppConfig = {
  provider: "click-to-chat",
  apiUrl: "https://graph.facebook.com/v20.0",
  apiToken: "",
  phoneId: "",
  notifyPositiveCopy: true
};

export const DEFAULT_SITE: SiteConfig = {
  appName: DEFAULT_BRAND_NAME,
  logoUrl: BRAND_ICON,
  supportEmail: "hello@qr24x7.in",
  appUrl: "",
  marketingTagline: DEFAULT_BRAND_TAGLINE,
  signupsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: "We'll be back shortly."
};

export const DEFAULT_TURNSTILE: TurnstileConfig = { siteKey: "", secretKey: "" };

export const DEFAULT_AI: AiConfig = {
  enabled: false,
  apiUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "openai/gpt-4o-mini",
  dailyCapPaise: 20000,
  estimatePaisePerCall: 100
};

function nonNegativeInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

async function readKey<T>(key: string, fallback: T): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    const parsed = row ? (JSON.parse(row.value) as T) : fallback;
    // Decrypt any secret fields before caching/returning.
    const value = row ? (transformSecrets(key, parsed, decryptSecret) as T) : parsed;
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
  // Encrypt secret fields at rest (deep-clone first so callers keep plaintext).
  const toStore =
    value && typeof value === "object"
      ? transformSecrets(key, JSON.parse(JSON.stringify(value)), encryptSecret)
      : value;
  const json = JSON.stringify(toStore);
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
    upiEnabled: stored.upiEnabled ?? false,
    upiId: stored.upiId || "",
    upiPayeeName: brandNameOrDefault(stored.upiPayeeName, DEFAULT_PAYMENTS.upiPayeeName),
    upiQrDataUrl: stored.upiQrDataUrl || "",
    usdtEnabled: stored.usdtEnabled ?? false,
    usdtNetwork: stored.usdtNetwork || DEFAULT_PAYMENTS.usdtNetwork,
    usdtAddress: stored.usdtAddress || "",
    usdtRateInr: stored.usdtRateInr || DEFAULT_PAYMENTS.usdtRateInr,
    mailVerifyEnabled: stored.mailVerifyEnabled ?? false,
    mailImapHost: stored.mailImapHost || process.env.IMAP_HOST || DEFAULT_PAYMENTS.mailImapHost,
    mailImapPort: stored.mailImapPort || Number(process.env.IMAP_PORT) || DEFAULT_PAYMENTS.mailImapPort,
    mailImapUser: stored.mailImapUser || process.env.IMAP_USER || "",
    mailImapPass: stored.mailImapPass || process.env.IMAP_PASS || "",
    mailFromFilter: stored.mailFromFilter || "",
    youpiBaseUrl: stored.youpiBaseUrl || process.env.YOUPI_BASE_URL || "",
    youpiMerchantId: stored.youpiMerchantId || process.env.YOUPI_MERCHANT_ID || "",
    youpiWebhookSecret: stored.youpiWebhookSecret || process.env.YOUPI_WEBHOOK_SECRET || "",
    sellerLegalName: brandNameOrDefault(stored.sellerLegalName, DEFAULT_PAYMENTS.sellerLegalName),
    sellerGstin: stored.sellerGstin || process.env.SELLER_GSTIN || "",
    sellerState: stored.sellerState || "",
    gstRate: stored.gstRate && stored.gstRate > 0 ? stored.gstRate : DEFAULT_PAYMENTS.gstRate
  };
}
export async function setPaymentsConfig(v: PaymentsConfig, by?: string) {
  await writeKey(SETTING_KEYS.payments, v, by);
}

function cleanPresets(value: unknown): ShippingConfig["presets"] {
  if (!Array.isArray(value)) return DEFAULT_SHIPPING.presets.map((preset) => ({ ...preset }));
  const presets = value
    .map((row) => {
      const preset = row && typeof row === "object" ? (row as ShippingConfig["presets"][number]) : null;
      if (!preset) return null;
      const next = {
        id: String(preset.id || ""),
        name: String(preset.name || ""),
        lengthMm: Math.floor(Number(preset.lengthMm)),
        widthMm: Math.floor(Number(preset.widthMm)),
        heightMm: Math.floor(Number(preset.heightMm)),
        weightGrams: Math.floor(Number(preset.weightGrams))
      };
      return presetError(next) ? null : next;
    })
    .filter((preset): preset is ShippingConfig["presets"][number] => preset != null);
  return presets.length ? presets : DEFAULT_SHIPPING.presets.map((preset) => ({ ...preset }));
}

export async function getShippingConfig(): Promise<ShippingConfig> {
  const stored = await readKey<Partial<ShippingConfig>>(SETTING_KEYS.shipping, {});
  const pickup = { ...DEFAULT_SHIPPING.pickup, ...(stored.pickup || {}) };
  const provider = stored.provider === "shiprocket" || stored.provider === "delhivery" || stored.provider === "mock"
    ? stored.provider
    : DEFAULT_SHIPPING.provider;
  return {
    provider,
    shiprocketEmail: stored.shiprocketEmail || process.env.SHIPROCKET_EMAIL || "",
    shiprocketPassword: stored.shiprocketPassword || process.env.SHIPROCKET_PASSWORD || "",
    delhiveryToken: stored.delhiveryToken || process.env.DELHIVERY_TOKEN || "",
    webhookSecret: stored.webhookSecret || process.env.SHIPPING_WEBHOOK_SECRET || "",
    pickup: {
      name: pickup.name || "",
      phone: pickup.phone || "",
      line1: pickup.line1 || "",
      city: pickup.city || "",
      state: pickup.state || "",
      pincode: pickup.pincode || ""
    },
    presets: cleanPresets(stored.presets)
  };
}

export async function setShippingConfig(value: ShippingConfig, by?: string) {
  const pickupProblem = pickupError(value.pickup);
  if (pickupProblem) throw new Error(pickupProblem);
  await writeKey(SETTING_KEYS.shipping, value, by);
}

export async function getShopCheckoutConfig(): Promise<ShopCheckoutConfig> {
  const stored = await readKey<Partial<ShopCheckoutConfig>>(SETTING_KEYS.shop, {});
  return normalizeShopCheckout(stored);
}

export async function setShopCheckoutConfig(value: ShopCheckoutConfig, by?: string) {
  const problem = shopCheckoutError(value);
  if (problem) throw new Error(problem);
  await writeKey(SETTING_KEYS.shop, normalizeShopCheckout(value), by);
}

/* ============== Pricing ============== */
function mergePlan(base: PlanInfo, stored?: Partial<PlanInfo>): PlanInfo {
  const merged: PlanInfo = {
    ...base,
    ...(stored || {}),
    tier: base.tier,
    limits: { ...base.limits, ...(stored?.limits || {}) }
  };
  if (merged.tagline === `Try ${PREVIOUS_BRAND_NAME} risk-free`) merged.tagline = base.tagline;
  return merged;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const stored = await readKey<Partial<PricingConfig>>(SETTING_KEYS.pricing, {});
  return {
    FREE: mergePlan(DEFAULT_PLANS.FREE, stored.FREE),
    STARTER: mergePlan(DEFAULT_PLANS.STARTER, stored.STARTER),
    GROWTH: mergePlan(DEFAULT_PLANS.GROWTH, stored.GROWTH),
    AGENCY: mergePlan(DEFAULT_PLANS.AGENCY, stored.AGENCY),
    FOUNDER: mergePlan(DEFAULT_PLANS.FOUNDER, stored.FOUNDER)
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
    smtpFrom: brandFromOrDefault(
      stored.smtpFrom || process.env.SMTP_FROM,
      `${DEFAULT_BRAND_NAME} <${stored.smtpUser || process.env.SMTP_USER || "noreply@qr24x7.in"}>`
    )
  };
}
export async function setEmailConfig(v: EmailConfig, by?: string) {
  await writeKey(SETTING_KEYS.email, v, by);
}

/* ============== WhatsApp ============== */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const stored = await readKey<Partial<WhatsAppConfig>>(SETTING_KEYS.whatsapp, {});
  const provider = (stored.provider as WhatsAppProvider) || "click-to-chat";
  return {
    provider,
    apiUrl: stored.apiUrl || process.env.WHATSAPP_API_URL || DEFAULT_WHATSAPP.apiUrl,
    apiToken: stored.apiToken || process.env.WHATSAPP_API_TOKEN || "",
    phoneId: stored.phoneId || process.env.WHATSAPP_PHONE_ID || "",
    notifyPositiveCopy: stored.notifyPositiveCopy ?? true
  };
}
export async function setWhatsAppConfig(v: WhatsAppConfig, by?: string) {
  await writeKey(SETTING_KEYS.whatsapp, v, by);
}

/* ============== Site ============== */
export async function getSiteConfig(): Promise<SiteConfig> {
  const stored = await readKey<Partial<SiteConfig>>(SETTING_KEYS.site, {});
  return {
    appName: brandNameOrDefault(stored.appName || process.env.NEXT_PUBLIC_APP_NAME, DEFAULT_SITE.appName),
    logoUrl: stored.logoUrl || DEFAULT_SITE.logoUrl,
    // The previous default address moves to the new domain; a custom address stays.
    supportEmail:
      stored.supportEmail && stored.supportEmail !== "hello@reviewqr.in"
        ? stored.supportEmail
        : DEFAULT_SITE.supportEmail,
    appUrl: stored.appUrl || process.env.NEXT_PUBLIC_APP_URL || "",
    marketingTagline: brandTaglineOrDefault(stored.marketingTagline, DEFAULT_SITE.marketingTagline),
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

/* ============== AI (OpenAI-compatible) ============== */
export async function getAiConfig(): Promise<AiConfig> {
  const stored = await readKey<Partial<AiConfig>>(SETTING_KEYS.ai, {});
  const envCap = process.env.AI_DAILY_CAP_PAISE;
  const envEstimate = process.env.AI_ESTIMATE_PAISE;
  return {
    enabled: stored.enabled ?? (process.env.AI_ENABLED === "true"),
    apiUrl: (stored.apiUrl || process.env.AI_API_URL || DEFAULT_AI.apiUrl).replace(/\/$/, ""),
    apiKey: stored.apiKey || process.env.AI_API_KEY || "",
    model: stored.model || process.env.AI_MODEL || DEFAULT_AI.model,
    dailyCapPaise: nonNegativeInt(
      stored.dailyCapPaise ?? envCap,
      DEFAULT_AI.dailyCapPaise
    ),
    estimatePaisePerCall: nonNegativeInt(
      stored.estimatePaisePerCall ?? envEstimate,
      DEFAULT_AI.estimatePaisePerCall
    )
  };
}
export async function setAiConfig(v: AiConfig, by?: string) {
  await writeKey(SETTING_KEYS.ai, v, by);
}

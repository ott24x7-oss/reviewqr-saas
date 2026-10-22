/**
 * Fixed module list. Add a module by appending it here. Plans store the id
 * as text, so a new id does not need a database enum migration.
 */
import type { PlanDuration, SubscriptionTier } from "@prisma/client";

export const MODULES = [
  {
    id: "REVIEWS",
    nameEn: "Reviews",
    nameHi: "रिव्यू",
    blurbEn: "Review QR and NFC page, private feedback, Google and Trustpilot links, AI polish",
    blurbHi: "रिव्यू QR और NFC पेज, निजी फ़ीडबैक, Google और Trustpilot लिंक, AI पॉलिश"
  },
  {
    id: "MENU",
    nameEn: "Menu",
    nameHi: "मेनू",
    blurbEn: "Service and product catalogue on the tap page, without ordering",
    blurbHi: "टैप पेज पर सर्विस और प्रोडक्ट कैटलॉग, बिना ऑर्डर के"
  },
  {
    id: "STORE",
    nameEn: "WhatsApp Store",
    nameHi: "व्हाट्सऐप स्टोर",
    blurbEn: "WhatsApp ordering website: cart, orders, store designs, and the order dashboard",
    blurbHi: "व्हाट्सऐप ऑर्डर वेबसाइट: कार्ट, ऑर्डर, स्टोर डिज़ाइन और ऑर्डर डैशबोर्ड"
  }
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

const MODULE_IDS = new Set<string>(MODULES.map((item) => item.id));

export function isModuleId(value: string): value is ModuleId {
  return MODULE_IDS.has(value);
}

export function cleanModules(values: readonly string[]): ModuleId[] {
  const seen = new Set<ModuleId>();
  for (const value of values) {
    if (isModuleId(value) && !seen.has(value)) seen.add(value);
  }
  return MODULES.map((item) => item.id).filter((id) => seen.has(id));
}

/** A combo is any plan that includes more than one module. */
export function isCombo(modules: readonly string[]) {
  return cleanModules(modules).length > 1;
}

export const DURATIONS: PlanDuration[] = ["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"];

export const DURATION_LABELS: Record<PlanDuration, { en: string; hi: string; months: number | null }> = {
  MONTH_1: { en: "1 month", hi: "1 महीना", months: 1 },
  MONTH_6: { en: "6 months", hi: "6 महीने", months: 6 },
  YEAR_1: { en: "1 year", hi: "1 साल", months: 12 },
  LIFETIME: { en: "Lifetime", hi: "लाइफटाइम", months: null }
};

export function durationMonths(duration: PlanDuration | null | undefined) {
  if (!duration) return 1;
  return DURATION_LABELS[duration].months;
}

export type PricingTab = "reviews" | "reviews-menu" | "store" | "all";

export const PRICING_TABS: Array<{ id: PricingTab; en: string; hi: string }> = [
  { id: "reviews", en: "Review only", hi: "सिर्फ़ रिव्यू" },
  { id: "reviews-menu", en: "Review + Menu", hi: "रिव्यू + मेनू" },
  { id: "store", en: "Restaurant & Café WhatsApp store", hi: "रेस्टोरेंट और कैफ़े व्हाट्सऐप स्टोर" },
  { id: "all", en: "All-in-one", hi: "ऑल-इन-वन" }
];

export function pricingTab(modules: readonly string[]): PricingTab {
  const set = new Set(cleanModules(modules));
  const reviews = set.has("REVIEWS");
  const menu = set.has("MENU");
  const store = set.has("STORE");
  if (reviews && menu && store) return "all";
  if (store) return "store";
  if (menu) return "reviews-menu";
  return "reviews";
}

export type PlanLimits = {
  businesses: number;
  qrCodes: number;
  products: number;
  staff: number;
  aiCalls: number;
  locations: number;
  reviews: number;
  campaigns: number;
  reviewTemplates: number;
  storeProducts: number;
  storeOrders: number;
  aiCallsPerMonth: number;
};

const LIMIT_KEYS: Array<keyof PlanLimits> = [
  "businesses",
  "qrCodes",
  "products",
  "staff",
  "aiCalls",
  "locations",
  "reviews",
  "campaigns",
  "reviewTemplates",
  "storeProducts",
  "storeOrders",
  "aiCallsPerMonth"
];

function nonNegative(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

export function parseLimits(value: unknown, fallback: PlanLimits): PlanLimits {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const products = nonNegative(row.products ?? row.storeProducts, fallback.products);
  const aiCalls = nonNegative(row.aiCalls ?? row.aiCallsPerMonth, fallback.aiCalls);
  const next = { ...fallback };
  for (const key of LIMIT_KEYS) next[key] = nonNegative(row[key], fallback[key]);
  next.products = products;
  next.storeProducts = nonNegative(row.storeProducts, products);
  next.aiCalls = aiCalls;
  next.aiCallsPerMonth = nonNegative(row.aiCallsPerMonth, aiCalls);
  return next;
}

export function limitValue(limits: PlanLimits, key: string) {
  if (key === "products" || key === "storeProducts") return limits.products;
  if (key === "aiCalls" || key === "aiCallsPerMonth") return limits.aiCalls;
  if (key in limits) return limits[key as keyof PlanLimits];
  return Number.POSITIVE_INFINITY;
}

export function savingsPercent(input: {
  pricePaise: number;
  mrpPaise?: number | null;
  monthlyPaise?: number | null;
  months?: number | null;
}) {
  const price = Math.max(0, Math.floor(input.pricePaise));
  const mrp = input.mrpPaise == null ? 0 : Math.floor(input.mrpPaise);
  if (mrp > price && mrp > 0) return Math.round(((mrp - price) / mrp) * 100);
  const months = input.months ?? 0;
  const monthly = input.monthlyPaise == null ? 0 : Math.floor(input.monthlyPaise);
  if (months > 1 && monthly > 0) {
    const full = monthly * months;
    if (full > price) return Math.round(((full - price) / full) * 100);
  }
  return 0;
}

export function legacyTierForModules(modules: readonly string[], lifetime: boolean): SubscriptionTier {
  if (lifetime && cleanModules(modules).length >= 3) return "FOUNDER";
  return "STARTER";
}

export function slugifyPlan(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "plan";
}

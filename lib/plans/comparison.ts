import { FEATURES, type FeatureModuleId } from "@reviewqr/shared";

export type PlanFeatureContext = {
  modules: readonly string[];
  limits: {
    qrCodes: number;
    products: number;
    staff: number;
    aiCalls: number;
    locations: number;
  };
};

const REVIEW_FEATURE_ORDER = [
  "Reviews log",
  "AI replies",
  "Testimonials",
  "Customers",
  "Analytics",
  "PDF report",
  "Campaigns",
  "Staff",
  "Locations",
  "Multiple QRs",
  "NFC",
  "Direct link",
  "Page themes"
] as const;

const REVIEW_FEATURE_ORDER_INDEX = new Map<string, number>(REVIEW_FEATURE_ORDER.map((label, index) => [label, index]));

/** Custom domains are stored as a setting, but routing support is not built. */
export function isMarketingFeature(label: string) {
  return FEATURES.find((feature) => feature.labelEn === label)?.id !== "custom-domain";
}

export function comparisonGroupForFeature(label: string): FeatureModuleId | null {
  return FEATURES.find((feature) => feature.labelEn === label)?.module ?? null;
}

export function comparisonFeatureOrder(label: string) {
  return REVIEW_FEATURE_ORDER_INDEX.get(label) ?? REVIEW_FEATURE_ORDER.length;
}

/** Applies module and capacity gates to known plan feature labels. */
export function isPlanFeatureAvailable(label: string, plan: PlanFeatureContext) {
  if (!isMarketingFeature(label)) return false;
  const feature = FEATURES.find((item) => item.labelEn === label);
  if (!feature) return true;
  if (!plan.modules.includes(feature.module)) return false;

  switch (feature.id) {
    case "staff":
      return plan.limits.staff > 0;
    case "multiple-qrs":
      return plan.limits.qrCodes > 1;
    case "locations":
      return plan.limits.locations > 1;
    case "ai-replies":
      return plan.limits.aiCalls > 0;
    case "menu":
    case "services-booking":
      return plan.limits.products > 0;
    default:
      return true;
  }
}

/** Hide module summaries when their plan has no capacity to use that catalogue. */
export function isPlanModuleUsable(moduleId: string, plan: PlanFeatureContext) {
  if (!plan.modules.includes(moduleId)) return false;
  if (moduleId === "MENU") return plan.limits.products > 0;
  return true;
}

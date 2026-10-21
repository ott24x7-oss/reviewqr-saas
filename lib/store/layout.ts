export const STORE_VIEWS = ["FOOD", "SHOP", "SERVICES"] as const;
export type StoreView = (typeof STORE_VIEWS)[number];

const FOOD_WORDS = ["cafe", "café", "restaurant", "bakery", "sweet", "food"];
const SERVICE_WORDS = ["salon", "clinic", "gym", "tutor", "spa", "beauty"];

/** Industry text maps to a storefront. Anything else is a shop. */
export function layoutFromIndustry(industry: string | null | undefined): StoreView {
  const value = (industry || "").trim().toLowerCase();
  if (FOOD_WORDS.some((word) => value.includes(word))) return "FOOD";
  if (SERVICE_WORDS.some((word) => value.includes(word))) return "SERVICES";
  return "SHOP";
}

/** Owner override wins. AUTO and a missing row follow the industry. */
export function resolveLayout(setting: string | null | undefined, industry: string | null | undefined): StoreView {
  if (setting === "FOOD" || setting === "SHOP" || setting === "SERVICES") return setting;
  return layoutFromIndustry(industry);
}

export function askOnWhatsApp(base: string, itemName: string) {
  const root = base.trim();
  if (!root) return "";
  try {
    const url = new URL(root);
    url.searchParams.set("text", `Hi, I want to ask about ${itemName}`.slice(0, 180));
    return url.toString();
  } catch {
    return "";
  }
}

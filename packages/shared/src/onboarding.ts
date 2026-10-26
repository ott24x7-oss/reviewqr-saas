export const BUSINESS_CATEGORIES = [
  { id: "cafe", en: "Café / restaurant", hi: "कैफ़े / रेस्टोरेंट" },
  { id: "salon", en: "Salon", hi: "सैलून" },
  { id: "shop", en: "Shop", hi: "दुकान" },
  { id: "clinic", en: "Clinic", hi: "क्लिनिक" },
  { id: "other", en: "Other", hi: "अन्य" }
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number]["id"];

export const ONBOARDING_THEMES = [
  { id: "sunset-mango", name: "Sunset", bg: "#fff1e4", ink: "#3a2016", button: "#9a3412" },
  { id: "ocean-breeze", name: "Ocean", bg: "#e0f2fe", ink: "#082f49", button: "#0c4a6e" },
  { id: "saffron", name: "Saffron", bg: "#fff7ed", ink: "#3b160c", button: "#9a3412" },
  { id: "monochrome-luxe", name: "Luxe", bg: "#f4f1ea", ink: "#1c1b18", button: "#1c1b18" }
] as const;

export type WizardItem = { name: string; price: string };

export type WizardDraft = {
  name: string;
  category: string;
  city: string;
  whatsapp: string;
  logo: string;
  cover: string;
  themeId: string;
  slug: string;
  googleReviewUrl: string;
  items: WizardItem[];
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A pasted web or WhatsApp link. Protocol is ignored; dots, slashes, and "http" stay rejected. */
export function pastedLinkRejected(value: string) {
  const text = value.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  return text.includes("http") || text.includes("/") || text.includes(".");
}

export function emptyDraft(): WizardDraft {
  return {
    name: "",
    category: "",
    city: "",
    whatsapp: "",
    logo: "",
    cover: "",
    themeId: "sunset-mango",
    slug: "",
    googleReviewUrl: "",
    items: []
  };
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function mergeDraft(value: unknown): WizardDraft {
  const raw = value && typeof value === "object" ? (value as Partial<WizardDraft>) : {};
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    name: clip(raw.name, 80),
    category: clip(raw.category, 20),
    city: clip(raw.city, 80),
    whatsapp: clip(raw.whatsapp, 20),
    logo: clip(raw.logo, 500),
    cover: clip(raw.cover, 500),
    themeId: clip(raw.themeId, 40) || "sunset-mango",
    slug: normalizeSlug(clip(raw.slug, 40)),
    googleReviewUrl: clip(raw.googleReviewUrl, 400),
    items: items.slice(0, 3).map((item) => ({
      name: clip(item && typeof item === "object" ? (item as WizardItem).name : "", 80),
      price: clip(item && typeof item === "object" ? (item as WizardItem).price : "", 12)
    }))
  };
}

export function normalizeSlug(value: string) {
  if (pastedLinkRejected(value)) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Page names to offer: the cleaned name, then name-2, name-3… */
export function slugCandidates(nameOrSlug: string) {
  const base = normalizeSlug(nameOrSlug).replace(/-\d+$/, "");
  if (!base || slugProblem(base)) return [];
  const list = [base];
  for (let n = 2; n <= 6; n += 1) list.push(`${base}-${n}`.slice(0, 40));
  return [...new Set(list)].filter((slug) => slugProblem(slug) === null);
}

/** Skip uses the typed link when it is free, otherwise the first free suggestion. */
export function skipSlugChoice(current: string, available: boolean, suggestions: string[]) {
  if (available && slugProblem(current) === null) return current;
  return suggestions.find((slug) => slugProblem(slug) === null) || null;
}

/** Shape only. Reserved names and taken names are checked on the server. */
export function slugProblem(slug: string): "empty" | "invalid" | null {
  if (!slug) return "empty";
  if (slug.length < 3 || !SLUG.test(slug)) return "invalid";
  return null;
}

export function isCategory(value: string): value is BusinessCategory {
  return BUSINESS_CATEGORIES.some((item) => item.id === value);
}

export function isOnboardingTheme(value: string) {
  return ONBOARDING_THEMES.some((item) => item.id === value);
}

function phoneOk(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function reviewUrlOk(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function wizardIssues(step: number, draft: WizardDraft): string[] {
  const issues: string[] = [];
  if (step === 1) {
    if (draft.name.trim().length < 2) issues.push("Enter the business name");
    if (!isCategory(draft.category)) issues.push("Choose a category");
    if (draft.city.trim().length < 2) issues.push("Enter the city");
    if (!phoneOk(draft.whatsapp)) issues.push("Enter the WhatsApp number");
  }
  if (step === 2) {
    if (!isOnboardingTheme(draft.themeId)) issues.push("Choose a theme");
  }
  if (step === 3) {
    const problem = slugProblem(draft.slug);
    if (problem === "empty") issues.push("Choose a page link");
    if (problem === "invalid") issues.push("Use letters and numbers in the page link");
  }
  if (step === 4) {
    if (!reviewUrlOk(draft.googleReviewUrl)) issues.push("Paste a Google review link");
    draft.items.forEach((item, index) => {
      const named = item.name.trim().length > 0;
      const priced = item.price.trim().length > 0;
      if (!named && !priced) return;
      if (item.name.trim().length < 1) issues.push(`Name item ${index + 1}`);
      if (!/^\d+(\.\d{1,2})?$/.test(item.price.trim())) issues.push(`Enter a price for item ${index + 1}`);
    });
  }
  return issues;
}

/** Last saved step to reopen. Null once the wizard is finished. */
export function resumeStep(step: number, completed: boolean): number | null {
  if (completed || step >= 5) return null;
  if (!Number.isFinite(step) || step < 1) return 1;
  return Math.min(4, Math.floor(step));
}

const LOCKED = {
  REVIEWS: {
    en: "Collect private feedback and offer a Google review link.",
    hi: "निजी प्रतिक्रिया लें और Google रिव्यू लिंक दें।"
  },
  MENU: {
    en: "Show your menu or services on the public page.",
    hi: "सार्वजनिक पेज पर मेनू या सेवाएँ दिखाएँ।"
  },
  STORE: {
    en: "Take WhatsApp orders from the public page.",
    hi: "सार्वजनिक पेज से WhatsApp ऑर्डर लें।"
  }
} as const;

export type LockedModule = keyof typeof LOCKED;

export function lockedModuleText(moduleId: LockedModule, lang: "en" | "hi") {
  return {
    title: lang === "hi" ? "यह आपके मौजूदा प्लान में शामिल नहीं है" : "Not included in your current plan",
    body: LOCKED[moduleId][lang]
  };
}

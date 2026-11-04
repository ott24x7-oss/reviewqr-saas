import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    appSetting: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => undefined)
    }
  }
}));

vi.mock("@/lib/plans/public", () => ({
  listPublicPlans: vi.fn(async () => [{ slug: "reviews" }])
}));

vi.mock("@/lib/local-seo", () => ({
  getDirectoryInventory: vi.fn(async () => ({ businesses: [{ slug: "pune-kitchen" }], pages: new Map(), byCity: new Map(), targets: [] })),
  getListedBusinessSitemapRows: vi.fn(async () => [{ slug: "pune-kitchen" }]),
  directoryPagePaths: vi.fn(() => ({ categoryPages: ["restaurants/pune"], categoryHubs: ["restaurants"], cityHubs: ["pune"], serviceCities: ["pune"] }))
}));

import { buildSeoMetadata, evaluateSeoChecklist, planSeoTitle } from "@/lib/seo";
import { DEFAULT_SEO_CONFIG, getSeoConfig, normalizeSeoConfig, seoConfigSchema, setSeoConfig } from "@/lib/settings";
import sitemap from "@/app/sitemap";

describe("SEO metadata builder", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://qr24x7.example";
  });

  it("sets a self canonical and the three language references for translated English pages", async () => {
    const metadata = await buildSeoMetadata({
      path: "/pricing",
      locale: "en",
      title: "QR Code Plans",
      description: "Compare QR24x7 plans for reviews, menus, and WhatsApp orders from one page.",
      translated: true
    }, DEFAULT_SEO_CONFIG);
    expect(metadata.alternates?.canonical).toBe("https://qr24x7.example/pricing");
    expect(metadata.alternates?.languages).toEqual({
      "en-IN": "https://qr24x7.example/pricing",
      "hi-IN": "https://qr24x7.example/hi/pricing",
      "x-default": "https://qr24x7.example/pricing"
    });
  });

  it("uses the Hindi self canonical and omits hreflang when the page is not translated", async () => {
    const metadata = await buildSeoMetadata({ path: "/privacy", locale: "hi", title: "गोपनीयता नीति", description: "यह विवरण केवल परीक्षण के लिए है।", translated: false }, DEFAULT_SEO_CONFIG);
    expect(metadata.alternates?.canonical).toBe("https://qr24x7.example/hi/privacy");
    expect(metadata.alternates?.languages).toBeUndefined();
    expect(metadata.openGraph?.locale).toBe("hi_IN");
  });

  it("uses trailing slash only for English home and the /hi path for Hindi home", async () => {
    const english = await buildSeoMetadata({ path: "/", title: "Home", description: "English home page." }, DEFAULT_SEO_CONFIG);
    const hindi = await buildSeoMetadata({ path: "/", locale: "hi", title: "होम", description: "हिंदी होम पेज।" }, DEFAULT_SEO_CONFIG);
    expect(english.alternates?.canonical).toBe("https://qr24x7.example/");
    expect(hindi.alternates?.canonical).toBe("https://qr24x7.example/hi");
  });

  it("builds plan titles from included modules and lets admin title overrides take precedence", async () => {
    const englishTitle = planSeoTitle("Growth", ["REVIEWS", "MENU", "STORE"], "en");
    const hindiTitle = planSeoTitle("ग्रोथ", ["REVIEWS", "MENU", "STORE"], "hi");
    expect(englishTitle).toBe("Growth Plan: Google Reviews, Menu & WhatsApp Orders");
    expect(hindiTitle).toBe("ग्रोथ प्लान: Google रिव्यू, मेनू और WhatsApp ऑर्डर");
    expect(planSeoTitle("Menu", ["MENU"], "en")).toBe("Menu Plan: Menu");
    expect(planSeoTitle("Reviews", ["REVIEWS"], "hi")).toBe("Reviews प्लान: Google रिव्यू");

    const defaultEnglish = await buildSeoMetadata({ path: "/plans/growth", title: englishTitle }, DEFAULT_SEO_CONFIG);
    const defaultHindi = await buildSeoMetadata({ path: "/plans/growth", locale: "hi", title: hindiTitle }, DEFAULT_SEO_CONFIG);
    expect(defaultEnglish.title).toEqual({ absolute: "Growth Plan: Google Reviews, Menu & WhatsApp Orders | QR24x7" });
    expect(defaultHindi.title).toEqual({ absolute: "ग्रोथ प्लान: Google रिव्यू, मेनू और WhatsApp ऑर्डर | QR24x7" });
    expect((defaultEnglish.title as { absolute: string }).absolute.length).toBeLessThanOrEqual(60);
    expect((defaultHindi.title as { absolute: string }).absolute.length).toBeLessThanOrEqual(60);

    const config = {
      ...DEFAULT_SEO_CONFIG,
      overrides: { "/plans/growth": { title: "Admin title", description: "", ogImageUrl: "", noindex: false } }
    };
    const metadata = await buildSeoMetadata({ path: "/plans/growth", title: englishTitle, description: "Plan description." }, config);
    expect(metadata.title).toEqual({ absolute: "Admin title | QR24x7" });
  });

  it("keeps local titles within the limit and does not append a duplicate brand suffix", async () => {
    const directory = await buildSeoMetadata({ path: "/in/restaurants/pune", title: "Best Restaurants in Pune: QR Menu & Reviews" }, DEFAULT_SEO_CONFIG);
    expect(directory.title).toEqual({ absolute: "Best Restaurants in Pune: QR Menu & Reviews | QR24x7" });
    expect((directory.title as { absolute: string }).absolute.length).toBeLessThanOrEqual(60);

    const categoryHub = await buildSeoMetadata({ path: "/in/restaurants", title: "Restaurants by City | QR24x7" }, DEFAULT_SEO_CONFIG);
    expect(categoryHub.title).toEqual({ absolute: "Restaurants by City | QR24x7" });
    expect((categoryHub.title as { absolute: string }).absolute.match(/\| QR24x7/g)).toHaveLength(1);
    const oldDuplicate = await buildSeoMetadata({ path: "/in/city/pune", title: "Local Businesses in Pune | QR24x7 | QR24x7" }, DEFAULT_SEO_CONFIG);
    expect(oldDuplicate.title).toEqual({ absolute: "Local Businesses in Pune | QR24x7" });
  });

  it("keeps a supplied title intact instead of truncating it with an ellipsis", async () => {
    const title = "A deliberately long title that the metadata helper must never cut with an ellipsis";
    const metadata = await buildSeoMetadata({ path: "/pricing", title }, DEFAULT_SEO_CONFIG);
    expect(metadata.title).toEqual({ absolute: `${title} | QR24x7` });
    expect((metadata.title as { absolute: string }).absolute).not.toContain("…");
    const longPlanTitle = planSeoTitle("VeryLongPlanName".repeat(10), ["REVIEWS", "MENU", "STORE"], "en");
    expect(longPlanTitle).not.toContain("…");
    expect(longPlanTitle).toBe("Plan: Reviews, Menu & WA Orders");
    expect(longPlanTitle.length).toBeLessThanOrEqual(51);
  });
});

describe("SEO settings", () => {
  it("returns defaults from the cached getter when no setting is stored", async () => {
    const value = await getSeoConfig();
    expect(value.defaultTitleTemplate).toBe("%s | QR24x7");
    expect(value.analytics.respectDnt).toBe(false);
    expect(value.overrides).toEqual({});
  });

  it("validates configuration and rejects malformed analytics IDs or private routes", async () => {
    expect(normalizeSeoConfig(null).defaultOgImageUrl).toBe(DEFAULT_SEO_CONFIG.defaultOgImageUrl);
    const invalid = {
      ...DEFAULT_SEO_CONFIG,
      analytics: { ...DEFAULT_SEO_CONFIG.analytics, ga4MeasurementId: "not-a-measurement-id" }
    };
    expect(seoConfigSchema.safeParse(invalid).success).toBe(false);
    const save = await setSeoConfig(invalid);
    expect(save.ok).toBe(false);
    const privateRoute = { ...DEFAULT_SEO_CONFIG, overrides: { "/login": { title: "", description: "", ogImageUrl: "", noindex: true } } };
    expect(seoConfigSchema.safeParse(privateRoute).success).toBe(false);
  });
});

describe("sitemap", () => {
  it("includes both locale paths with alternates and omits private pages", async () => {
    const entries = await sitemap();
    const origin = new URL(entries[0].url).origin;
    expect(entries.some((entry) => entry.url === `${origin}/`)).toBe(true);
    expect(entries.some((entry) => entry.url === `${origin}/hi`)).toBe(true);
    const english = entries.find((entry) => entry.url === `${origin}/pricing`);
    const hindi = entries.find((entry) => entry.url === `${origin}/hi/pricing`);
    expect(english?.alternates?.languages).toEqual({
      "en-IN": `${origin}/pricing`,
      "hi-IN": `${origin}/hi/pricing`,
      "x-default": `${origin}/pricing`
    });
    expect(hindi?.alternates?.languages).toBeDefined();
    expect(entries.some((entry) => /\/(login|register|account\/delete)$/.test(entry.url))).toBe(false);
    expect(entries.some((entry) => entry.url === `${origin}/reseller-terms`)).toBe(true);
  });

  it("includes indexable local pages with locale alternates and listed business pages", async () => {
    const entries = await sitemap();
    const origin = new URL(entries[0].url).origin;
    const english = entries.find((entry) => entry.url === `${origin}/in/restaurants/pune`);
    const hindi = entries.find((entry) => entry.url === `${origin}/hi/in/restaurants/pune`);
    expect(english?.alternates?.languages).toEqual({
      "en-IN": `${origin}/in/restaurants/pune`, "hi-IN": `${origin}/hi/in/restaurants/pune`, "x-default": `${origin}/in/restaurants/pune`
    });
    expect(hindi?.alternates?.languages).toBeDefined();
    expect(entries.some((entry) => entry.url === `${origin}/qr-code-for-google-reviews/pune`)).toBe(true);
    expect(entries.some((entry) => entry.url === `${origin}/pune-kitchen`)).toBe(true);
  });
});

describe("SEO checklist rules", () => {
  it("warns for bad title, description, canonical, locale references, and H1 count", () => {
    const [result] = evaluateSeoChecklist([{ path: "/pricing", locale: "en", title: "Too short", description: "Brief", canonical: "", hasHreflang: false, h1Count: 2 }]);
    expect(result.checks.map((check) => check.status)).toEqual(["warn", "warn", "warn", "warn", "warn"]);
  });

  it("treats hreflang as not applicable when a legal page has no full Hindi translation", () => {
    const [result] = evaluateSeoChecklist([{ path: "/hi/privacy", locale: "hi", title: "QR24x7 Privacy Policy | QR24x7", description: "x".repeat(145), canonical: "https://qr24x7.example/hi/privacy", hasHreflang: false, hreflangExpected: false, h1Count: 1 }]);
    expect(result.checks.find((check) => check.key === "hreflang")?.status).toBe("pass");
  });

  it("reports the localized page path and ignores one trailing slash in canonical URLs", () => {
    const results = evaluateSeoChecklist([
      { path: "/", locale: "en", title: "A sufficiently descriptive home page title", description: "x".repeat(145), canonical: "https://qr24x7.example", hasHreflang: true, h1Count: 1 },
      { path: "/", locale: "hi", title: "हिंदी होम पेज का पर्याप्त वर्णन करने वाला शीर्षक", description: "x".repeat(145), canonical: "https://qr24x7.example/hi/", hasHreflang: true, h1Count: 1 },
      { path: "/features", locale: "hi", title: "हिंदी पेज का पर्याप्त वर्णन करने वाला शीर्षक", description: "x".repeat(145), canonical: "https://qr24x7.example/hi/features/", hasHreflang: true, h1Count: 1 }
    ]);
    expect(results.map((result) => result.path)).toEqual(["/", "/hi", "/hi/features"]);
    expect(results.map((result) => result.checks.find((check) => check.key === "canonical")?.status)).toEqual(["pass", "pass", "pass"]);
  });
});

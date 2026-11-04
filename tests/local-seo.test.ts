import { describe, expect, it } from "vitest";
import {
  buildBusinessJsonLd,
  buildBreadcrumbJsonLd,
  buildDirectoryJsonLd,
  buildFaqJsonLd,
  directoryPagePaths,
  directorySeoTitle,
  indexableBusinessCount,
  LOCAL_CATEGORIES,
  LOCAL_CITIES,
  normalizeCity,
  normalizeIndustry,
  serviceSeoTitle,
  type DirectoryBusiness
} from "@/lib/local-seo";
import { DEFAULT_LOCAL_PAGES_CONFIG } from "@/lib/settings";

const sample: DirectoryBusiness = {
  id: "biz-1", name: "Pune Kitchen", slug: "pune-kitchen", industry: "Restaurant", city: "Pune", state: "Maharashtra",
  address: "FC Road", pincode: "411004", logo: null, coverImage: null, whatsappNumber: null, storeEnabled: false,
  ratingAverage: 4.5, reviewCount: 2, updatedAt: new Date("2026-11-04"), category: normalizeIndustry("restaurant")!, normalizedCity: normalizeCity("Pune")!
};

describe("local SEO normalization", () => {
  it("maps known category names and aliases to fixed slugs", () => {
    expect(normalizeIndustry("  Café ")?.slug).toBe("cafes");
    expect(normalizeIndustry("Dental Clinic")?.slug).toBe("dentists");
    expect(normalizeIndustry("retail shop")?.slug).toBe("retail-shops");
    expect(normalizeIndustry("unknown services")).toBeNull();
  });

  it("maps city aliases to canonical slugs and excludes unknown cities", () => {
    expect(normalizeCity(" Bangalore ")?.slug).toBe("bengaluru");
    expect(normalizeCity("Bombay")?.slug).toBe("mumbai");
    expect(normalizeCity("Gurgaon")?.slug).toBe("gurugram");
    expect(normalizeCity("Atlantis")).toBeNull();
  });
});

describe("thin content and sitemap route rules", () => {
  it("indexes a page at the configured minimum only", () => {
    expect(indexableBusinessCount(2, 3)).toBe(false);
    expect(indexableBusinessCount(3, 3)).toBe(true);
  });

  it("lists only qualifying directory routes and omits local routes when disabled", () => {
    const pages = new Map([
      ["restaurants/pune", [sample, sample, sample]],
      ["cafes/pune", [sample]],
      ["restaurants/mumbai", [sample, sample, sample]]
    ]);
    const byCity = new Map([["pune", [sample, sample, sample, sample]], ["mumbai", [sample, sample, sample]]]);
    const inventory = { businesses: [...pages.values()].flat(), pages, byCity, targets: [normalizeCity("Bengaluru")!] };
    expect(directoryPagePaths({ ...DEFAULT_LOCAL_PAGES_CONFIG, minBusinessesPerPage: 3 }, inventory)).toEqual({
      categoryPages: ["restaurants/pune", "restaurants/mumbai"],
      categoryHubs: ["restaurants"], cityHubs: ["pune", "mumbai"], serviceCities: ["pune", "mumbai", "bengaluru"]
    });
    expect(directoryPagePaths({ ...DEFAULT_LOCAL_PAGES_CONFIG, enabled: false }, inventory).serviceCities).toEqual([]);
  });

  it("omits category and city hubs when every directory page is below the indexable minimum", () => {
    const pages = new Map([["cafes/pune", [sample]], ["restaurants/mumbai", [sample, sample]]]);
    const inventory = { businesses: [...pages.values()].flat(), pages, byCity: new Map([["pune", [sample]], ["mumbai", [sample, sample]]]), targets: [] };
    expect(directoryPagePaths({ ...DEFAULT_LOCAL_PAGES_CONFIG, minBusinessesPerPage: 3 }, inventory)).toMatchObject({
      categoryPages: [], categoryHubs: [], cityHubs: [], serviceCities: ["pune", "mumbai"]
    });
  });
});

describe("local SEO titles", () => {
  it("keeps every local directory and service title under 60 characters with the brand suffix", () => {
    for (const category of LOCAL_CATEGORIES) for (const city of LOCAL_CITIES) {
      expect(directorySeoTitle(category, city, "en").length + " | QR24x7".length).toBeLessThanOrEqual(60);
      expect(directorySeoTitle(category, city, "hi").length + " | QR24x7".length).toBeLessThanOrEqual(60);
    }
    for (const city of LOCAL_CITIES) {
      expect(serviceSeoTitle(city, "en").length + " | QR24x7".length).toBeLessThanOrEqual(60);
      expect(serviceSeoTitle(city, "hi").length + " | QR24x7".length).toBeLessThanOrEqual(60);
    }
    expect(directorySeoTitle(normalizeIndustry("restaurant")!, normalizeCity("Pune")!, "en")).toBe("Best Restaurants in Pune: QR Menu & Reviews");
  });
});

describe("local SEO JSON-LD", () => {
  it("builds ItemList entries with LocalBusiness addresses and includes ratings only with real reviews", () => {
    const schema = buildDirectoryJsonLd({ businesses: [sample, { ...sample, id: "biz-2", reviewCount: 0, ratingAverage: null }], category: sample.category, city: sample.normalizedCity, locale: "en" });
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].item).toMatchObject({ "@type": "LocalBusiness", name: "Pune Kitchen", address: { addressLocality: "Pune" }, aggregateRating: { ratingValue: 4.5, reviewCount: 2 } });
    expect(schema.itemListElement[1].item).not.toHaveProperty("aggregateRating");
    const withCover = buildDirectoryJsonLd({ businesses: [{ ...sample, coverImage: "https://example.com/cover.jpg" }], category: sample.category, city: sample.normalizedCity, locale: "en" });
    expect(withCover.itemListElement[0].item).toHaveProperty("image", "https://example.com/cover.jpg");
  });

  it("omits a business aggregate rating when there are no reviews", () => {
    const schema = buildBusinessJsonLd({ name: "Pune Kitchen", slug: "pune-kitchen", industry: "Restaurant", city: "Pune", state: "Maharashtra", address: null, pincode: null, logo: null, coverImage: null }, null, 0);
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(buildBusinessJsonLd({ name: "Pune Kitchen", slug: "pune-kitchen", industry: null, city: null, state: null, address: null, pincode: null, logo: null, coverImage: null }, 4.5, 1)).toHaveProperty("aggregateRating.reviewCount", 1);
  });

  it("builds breadcrumb and FAQ schemas", () => {
    expect(buildBreadcrumbJsonLd([{ name: "Home", path: "/" }]).itemListElement[0]).toMatchObject({ position: 1, name: "Home" });
    expect(buildFaqJsonLd([{ question: "Q?", answer: "A." }]).mainEntity[0]).toMatchObject({ "@type": "Question", name: "Q?" });
  });
});

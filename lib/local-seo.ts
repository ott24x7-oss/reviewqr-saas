import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import type { LocalPagesConfig } from "@/lib/settings";

export type SeoLocale = "en" | "hi";

export const LOCAL_CATEGORIES = [
  { slug: "restaurants", en: "Restaurants", hi: "रेस्तराँ", aliases: ["restaurant", "restaurants", "food", "dining", "eatery", "eateries"] },
  { slug: "cafes", en: "Cafes", hi: "कैफ़े", aliases: ["cafe", "cafes", "café", "coffee shop", "coffee shops"] },
  { slug: "bakeries", en: "Bakeries", hi: "बेकरी", aliases: ["bakery", "bakeries", "cake shop", "cake shops"] },
  { slug: "salons", en: "Salons", hi: "सैलून", aliases: ["salon", "salons", "beauty salon", "hair salon", "barber", "barbers"] },
  { slug: "spas", en: "Spas", hi: "स्पा", aliases: ["spa", "spas", "wellness", "wellness centre", "wellness center"] },
  { slug: "gyms", en: "Gyms", hi: "जिम", aliases: ["gym", "gyms", "fitness", "fitness center", "fitness centre"] },
  { slug: "clinics", en: "Clinics", hi: "क्लिनिक", aliases: ["clinic", "clinics", "medical clinic", "health clinic"] },
  { slug: "dentists", en: "Dentists", hi: "दंत चिकित्सक", aliases: ["dentist", "dentists", "dental", "dental clinic"] },
  { slug: "hotels", en: "Hotels", hi: "होटल", aliases: ["hotel", "hotels", "resort", "resorts", "lodging"] },
  { slug: "retail-shops", en: "Retail shops", hi: "रिटेल दुकानें", aliases: ["retail", "retail shop", "retail shops", "shop", "shops", "store", "stores"] },
  { slug: "pharmacies", en: "Pharmacies", hi: "फ़ार्मेसी", aliases: ["pharmacy", "pharmacies", "chemist", "chemists", "medical store", "medical stores"] },
  { slug: "coaching", en: "Coaching centres", hi: "कोचिंग सेंटर", aliases: ["coaching", "coaching centre", "coaching center", "tuition", "tutoring", "education"] }
] as const;

export const LOCAL_CITIES = [
  { slug: "ahmedabad", en: "Ahmedabad", hi: "अहमदाबाद", aliases: ["ahmedabad", "amdavad"] },
  { slug: "bengaluru", en: "Bengaluru", hi: "बेंगलुरु", aliases: ["bengaluru", "bangalore", "bengaluru urban"] },
  { slug: "bhopal", en: "Bhopal", hi: "भोपाल", aliases: ["bhopal"] },
  { slug: "bhubaneswar", en: "Bhubaneswar", hi: "भुवनेश्वर", aliases: ["bhubaneswar"] },
  { slug: "chandigarh", en: "Chandigarh", hi: "चंडीगढ़", aliases: ["chandigarh"] },
  { slug: "chennai", en: "Chennai", hi: "चेन्नई", aliases: ["chennai", "madras"] },
  { slug: "coimbatore", en: "Coimbatore", hi: "कोयंबटूर", aliases: ["coimbatore"] },
  { slug: "delhi", en: "Delhi", hi: "दिल्ली", aliases: ["delhi", "new delhi", "nct delhi"] },
  { slug: "goa", en: "Goa", hi: "गोवा", aliases: ["goa", "panaji", "panjim"] },
  { slug: "gurugram", en: "Gurugram", hi: "गुरुग्राम", aliases: ["gurugram", "gurgaon"] },
  { slug: "guwahati", en: "Guwahati", hi: "गुवाहाटी", aliases: ["guwahati"] },
  { slug: "hyderabad", en: "Hyderabad", hi: "हैदराबाद", aliases: ["hyderabad"] },
  { slug: "indore", en: "Indore", hi: "इंदौर", aliases: ["indore"] },
  { slug: "jaipur", en: "Jaipur", hi: "जयपुर", aliases: ["jaipur"] },
  { slug: "kochi", en: "Kochi", hi: "कोच्चि", aliases: ["kochi", "cochin"] },
  { slug: "kolkata", en: "Kolkata", hi: "कोलकाता", aliases: ["kolkata", "calcutta"] },
  { slug: "lucknow", en: "Lucknow", hi: "लखनऊ", aliases: ["lucknow"] },
  { slug: "mumbai", en: "Mumbai", hi: "मुंबई", aliases: ["mumbai", "bombay"] },
  { slug: "mysuru", en: "Mysuru", hi: "मैसूरु", aliases: ["mysuru", "mysore"] },
  { slug: "nagpur", en: "Nagpur", hi: "नागपुर", aliases: ["nagpur"] },
  { slug: "nashik", en: "Nashik", hi: "नासिक", aliases: ["nashik", "nasik"] },
  { slug: "noida", en: "Noida", hi: "नोएडा", aliases: ["noida"] },
  { slug: "patna", en: "Patna", hi: "पटना", aliases: ["patna"] },
  { slug: "pune", en: "Pune", hi: "पुणे", aliases: ["pune", "poona"] },
  { slug: "surat", en: "Surat", hi: "सूरत", aliases: ["surat"] },
  { slug: "thane", en: "Thane", hi: "ठाणे", aliases: ["thane"] },
  { slug: "thiruvananthapuram", en: "Thiruvananthapuram", hi: "तिरुवनंतपुरम", aliases: ["thiruvananthapuram", "trivandrum"] },
  { slug: "vadodara", en: "Vadodara", hi: "वडोदरा", aliases: ["vadodara", "baroda"] },
  { slug: "varanasi", en: "Varanasi", hi: "वाराणसी", aliases: ["varanasi", "banaras"] },
  { slug: "visakhapatnam", en: "Visakhapatnam", hi: "विशाखापत्तनम", aliases: ["visakhapatnam", "vizag"] }
] as const;

export type LocalCategory = (typeof LOCAL_CATEGORIES)[number];
export type LocalCity = (typeof LOCAL_CITIES)[number];

function normalizeWords(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ");
}

export function normalizeIndustry(value: string | null | undefined): LocalCategory | null {
  const normalized = normalizeWords(value || "");
  return LOCAL_CATEGORIES.find((category) => category.aliases.some((alias) => normalizeWords(alias) === normalized)) || null;
}

export function normalizeCity(value: string | null | undefined): LocalCity | null {
  const normalized = normalizeWords(value || "");
  return LOCAL_CITIES.find((city) => city.aliases.some((alias) => normalizeWords(alias) === normalized)) || null;
}

export function cityFromSlug(slug: string) { return LOCAL_CITIES.find((city) => city.slug === slug) || null; }
export function categoryFromSlug(slug: string) { return LOCAL_CATEGORIES.find((category) => category.slug === slug) || null; }
export function indexableBusinessCount(count: number, minimum: number) { return count >= minimum; }

/** Keep title text to 51 characters so the default brand suffix stays within 60. */
function localSeoTitle(candidates: string[]) {
  return candidates.find((title) => title.length <= 51) || candidates[candidates.length - 1] || "QR24x7 Local Businesses";
}

export function directorySeoTitle(category: LocalCategory, city: LocalCity, locale: SeoLocale) {
  if (locale === "hi") return localSeoTitle([
    `${city.hi} में ${category.hi}: QR मेनू और समीक्षाएँ`,
    `${city.hi} में ${category.hi}: QR मेनू`,
    `${city.hi}: ${category.hi} और QR मेनू`,
    `${city.hi} में ${category.hi}`
  ]);
  return localSeoTitle([
    `Best ${category.en} in ${city.en}: QR Menu & Reviews`,
    `${category.en} in ${city.en}: QR Menus & Reviews`,
    `${category.en} in ${city.en}: QR Menus`,
    `${category.en} in ${city.en}`
  ]);
}

export function serviceSeoTitle(city: LocalCity, locale: SeoLocale) {
  if (locale === "hi") return localSeoTitle([
    `${city.hi} में Google समीक्षा QR`,
    `Google समीक्षा QR: ${city.hi}`,
    `${city.hi} में समीक्षा QR`
  ]);
  return localSeoTitle([
    `Google Review QR Code in ${city.en}`,
    `Review QR for ${city.en}`,
    `Google Review QR in ${city.en}`
  ]);
}

export type DirectoryBusiness = {
  id: string; name: string; slug: string; industry: string; city: string; state: string | null;
  address: string | null; pincode: string | null; logo: string | null; coverImage: string | null; whatsappNumber: string | null;
  storeEnabled: boolean; ratingAverage: number | null; reviewCount: number;
  category: LocalCategory; normalizedCity: LocalCity;
};

export type ListedBusinessSeo = {
  id: string; name: string; slug: string; industry: string | null; city: string | null; state: string | null;
  address: string | null; pincode: string | null; logo: string | null; coverImage: string | null; whatsappNumber: string | null;
  storeEnabled: boolean; isPublished: boolean; ratingAverage: number | null; reviewCount: number;
};

const loadListedBusinessRows = unstable_cache(async (): Promise<ListedBusinessSeo[]> => {
  return prisma.$queryRaw<ListedBusinessSeo[]>`
    SELECT b."id", b."name", b."slug", b."industry", b."city", b."state", b."address", b."pincode",
      b."logo", b."coverImage", b."whatsappNumber", (ss."businessId" IS NOT NULL) AS "storeEnabled", (tp."publishedAt" IS NOT NULL) AS "isPublished",
      COALESCE(r."reviewCount", 0)::int AS "reviewCount", r."ratingAverage"::float8 AS "ratingAverage"
    FROM "Business" b
    JOIN "User" u ON u."id" = b."ownerId"
    LEFT JOIN "TapPage" tp ON tp."businessId" = b."id"
    LEFT JOIN "StoreSettings" ss ON ss."businessId" = b."id"
    LEFT JOIN (
      SELECT "businessId", COUNT(*) AS "reviewCount", AVG("rating") AS "ratingAverage"
      FROM "Review" GROUP BY "businessId"
    ) r ON r."businessId" = b."id"
    WHERE b."listedInDirectory" = TRUE AND b."isActive" = TRUE AND b."archived" = FALSE
      AND u."deletedAt" IS NULL AND u."suspendedAt" IS NULL
      AND (
        (u."subscriptionStatus" = 'ACTIVE' AND (u."subscriptionTier" = 'FOUNDER' OR u."subscriptionEndsAt" IS NULL OR u."subscriptionEndsAt" >= NOW()))
        OR (u."subscriptionStatus" = 'TRIALING' AND (u."trialEndsAt" IS NULL OR u."trialEndsAt" >= NOW()) AND (u."subscriptionEndsAt" IS NULL OR u."subscriptionEndsAt" >= NOW()))
      )
  `;
}, ["local-seo-listed-business-rows"], { revalidate: 3600, tags: ["local-directory"] });

const loadDirectoryRows = unstable_cache(async (): Promise<DirectoryBusiness[]> => {
  const rows = await loadListedBusinessRows();
  return rows.flatMap((row) => {
    if (!row.isPublished) return [];
    const category = normalizeIndustry(row.industry);
    const normalizedCity = normalizeCity(row.city);
    return category && normalizedCity ? [{ ...row, industry: row.industry!, city: row.city!, category, normalizedCity }] : [];
  });
}, ["local-seo-directory-rows"], { revalidate: 3600, tags: ["local-directory"] });

export async function getDirectoryInventory(config: LocalPagesConfig) {
  const businesses = await loadDirectoryRows();
  const pages = new Map<string, DirectoryBusiness[]>();
  const byCity = new Map<string, DirectoryBusiness[]>();
  for (const business of businesses) {
    const key = `${business.category.slug}/${business.normalizedCity.slug}`;
    const categoryCityRows = pages.get(key) || [];
    categoryCityRows.push(business);
    pages.set(key, categoryCityRows);
    const cityRows = byCity.get(business.normalizedCity.slug) || [];
    cityRows.push(business);
    byCity.set(business.normalizedCity.slug, cityRows);
  }
  const targets = config.targetCities.map(normalizeCity).filter((city): city is LocalCity => Boolean(city));
  return { businesses, pages, byCity, targets };
}

export async function getListedBusinessBySlug(slug: string) {
  return (await loadListedBusinessRows()).find((business) => business.slug === slug) || null;
}

export async function getListedBusinessSitemapRows() { return loadListedBusinessRows(); }

export async function getDirectoryPage(categorySlug: string, citySlug: string, config: LocalPagesConfig) {
  const category = categoryFromSlug(categorySlug);
  const city = cityFromSlug(citySlug);
  if (!category || !city || !config.enabled) return null;
  const inventory = await getDirectoryInventory(config);
  const businesses = inventory.pages.get(`${category.slug}/${city.slug}`) || [];
  return { category, city, businesses, indexable: indexableBusinessCount(businesses.length, config.minBusinessesPerPage), inventory };
}

export function localIntro(config: LocalPagesConfig, category: LocalCategory, city: LocalCity, locale: SeoLocale) {
  const override = config.intros[`${category.slug}/${city.slug}`]?.[locale]?.trim();
  if (override) return override;
  return locale === "hi"
    ? `${city.hi} में ${category.hi} के विकल्प देखें। यहाँ QR24x7 पेज, डिजिटल मेनू और ग्राहकों की Google समीक्षाओं की जानकारी वाले स्थानीय व्यवसाय मिलेंगे।`
    : `Explore ${category.en.toLowerCase()} in ${city.en}. Compare local businesses with QR24x7 pages, digital menus and customer Google review details before you visit or order.`;
}

export function localFaqs(category: LocalCategory, city: LocalCity, locale: SeoLocale) {
  if (locale === "hi") return [
    { question: `${city.hi} में ${category.hi} कैसे चुनें?`, answer: `पता, उपलब्ध सेवाएँ और ग्राहक रेटिंग देखें, फिर व्यवसाय का QR24x7 पेज खोलें।` },
    { question: "QR24x7 पेज पर क्या जानकारी मिलेगी?", answer: "आप मेनू, संपर्क विवरण, WhatsApp ऑर्डर और Google समीक्षा की जानकारी देख सकते हैं।" },
    { question: "क्या मैं अपने व्यवसाय को इस सूची में जोड़ सकता हूँ?", answer: "हाँ। QR24x7 पर मुफ़्त खाता बनाएँ, अपना पेज प्रकाशित करें और डैशबोर्ड में डायरेक्टरी सूची चालू करें।" }
  ];
  return [
    { question: `How can I compare ${category.en.toLowerCase()} in ${city.en}?`, answer: "Check the address, services and customer ratings, then open a business’s QR24x7 page for current details." },
    { question: "What can I find on a QR24x7 business page?", answer: "A page may include a digital menu, contact details, WhatsApp ordering and Google review links." },
    { question: "How can my business join this directory?", answer: "Create a free QR24x7 account, publish your business page and turn on directory listing in your dashboard." }
  ];
}

function siteOrigin() {
  try { return new URL(process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in").origin; }
  catch { return "https://qr24x7.in"; }
}

export function buildDirectoryJsonLd(input: { businesses: DirectoryBusiness[]; category: LocalCategory; city: LocalCity; locale: SeoLocale }) {
  const origin = siteOrigin();
  const items = input.businesses.map((business, index) => ({
    "@type": "ListItem", position: index + 1,
    item: {
      "@type": "LocalBusiness", name: business.name, url: `${origin}/${business.slug}`,
      address: { "@type": "PostalAddress", ...(business.address ? { streetAddress: business.address } : {}), addressLocality: input.city.en, ...(business.state ? { addressRegion: business.state } : {}), ...(business.pincode ? { postalCode: business.pincode } : {}), addressCountry: "IN" },
      ...(business.coverImage || business.logo ? { image: business.coverImage || business.logo } : {}),
      ...(business.ratingAverage != null && business.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(business.ratingAverage.toFixed(1)), reviewCount: business.reviewCount } } : {})
    }
  }));
  return { "@context": "https://schema.org", "@type": "ItemList", name: `${input.category.en} in ${input.city.en}`, itemListElement: items };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  const origin = siteOrigin();
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: `${origin}${item.path}` })) };
}

export function buildFaqJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) };
}

export function buildBusinessJsonLd(business: { name: string; slug: string; industry: string | null; city: string | null; state: string | null; address: string | null; pincode: string | null; logo: string | null; coverImage?: string | null }, ratingAverage: number | null, reviewCount: number) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: business.name,
    url: `${origin}/${business.slug}`,
    ...(business.industry ? { additionalType: business.industry } : {}), ...(business.coverImage || business.logo ? { image: business.coverImage || business.logo } : {}),
    address: { "@type": "PostalAddress", ...(business.address ? { streetAddress: business.address } : {}), ...(business.city ? { addressLocality: business.city } : {}), ...(business.state ? { addressRegion: business.state } : {}), ...(business.pincode ? { postalCode: business.pincode } : {}), addressCountry: "IN" },
    ...(ratingAverage != null && reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(ratingAverage.toFixed(1)), reviewCount } } : {})
  };
}

export function directoryPagePaths(config: LocalPagesConfig, inventory: Awaited<ReturnType<typeof getDirectoryInventory>>) {
  if (!config.enabled) return { categoryPages: [] as string[], categoryHubs: [] as string[], cityHubs: [] as string[], serviceCities: [] as string[] };
  const categoryPages = [...inventory.pages.entries()].filter(([, rows]) => indexableBusinessCount(rows.length, config.minBusinessesPerPage)).map(([key]) => key);
  const categoryHubs = [...new Set(categoryPages.map((key) => key.split("/")[0]))];
  const cityHubs = [...new Set(categoryPages.map((key) => key.split("/")[1]))];
  const serviceCities = [...new Set([...inventory.byCity.keys(), ...inventory.targets.map((city) => city.slug)])];
  return { categoryPages, categoryHubs, cityHubs, serviceCities };
}

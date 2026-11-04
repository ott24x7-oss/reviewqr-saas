import type { Metadata } from "next";
import { getSeoConfig, type SeoConfig } from "@/lib/settings";

export type SeoLocale = "en" | "hi";
export type SeoPageInput = {
  path: string;
  locale?: SeoLocale;
  title: string;
  description?: string;
  image?: string;
  translated?: boolean;
};

export type SeoChecklistInput = {
  path: string;
  locale: SeoLocale;
  title: string;
  description: string;
  canonical?: string;
  hasHreflang: boolean;
  hreflangExpected?: boolean;
  h1Count: number;
  fetchError?: boolean;
};

export type SeoChecklistResult = {
  path: string;
  locale: SeoLocale;
  checks: Array<{ key: string; label: string; status: "pass" | "warn"; detail: string }>;
};

export type SeoChecklistRoute = Pick<SeoChecklistInput, "path" | "locale" | "hreflangExpected">;

export const SEO_STATIC_ROUTES = [
  { path: "/", translated: true, titleEn: "Google Review QR, Menu & WhatsApp Orders", titleHi: "Google रिव्यू, मेनू और WhatsApp ऑर्डर" },
  { path: "/features", translated: true, titleEn: "QR Code Features for Reviews, Menus & Orders", titleHi: "QR Code की रिव्यू, मेनू और ऑर्डर सुविधाएँ" },
  { path: "/how-it-works", translated: true, titleEn: "How QR Code Reviews, Menus & Orders Work", titleHi: "QR Code से रिव्यू, मेनू और ऑर्डर" },
  { path: "/pricing", translated: true, titleEn: "QR Code Plans for Reviews, Menus & WhatsApp Orders", titleHi: "QR Code प्लान: रिव्यू, मेनू और WhatsApp" },
  { path: "/about", translated: true, titleEn: "About QR24x7 and Our QR Review Platform", titleHi: "QR24x7 के बारे में" },
  { path: "/demo", translated: true, titleEn: "Try the QR24x7 Review Page Demo", titleHi: "QR24x7 रिव्यू पेज का डेमो देखें" },
  { path: "/privacy", translated: false, titleEn: "QR24x7 Privacy Policy", titleHi: "QR24x7 गोपनीयता नीति" },
  { path: "/terms", translated: false, titleEn: "QR24x7 Terms of Service", titleHi: "QR24x7 सेवा की शर्तें" },
  { path: "/refund", translated: false, titleEn: "QR24x7 Refund & Cancellation Policy", titleHi: "QR24x7 रिफंड और रद्दीकरण नीति" },
  { path: "/reseller-terms", translated: true, titleEn: "QR24x7 Reseller Terms", titleHi: "QR24x7 रीसेलर की शर्तें" }
] as const;

const ROUTE_DESCRIPTIONS: Record<string, { en: string; hi: string }> = {
  "/": {
    en: "Collect Google reviews, share a digital menu and take WhatsApp orders from one QR and NFC page. Set up your business page in minutes with QR24x7.",
    hi: "एक QR और NFC पेज से Google रिव्यू पाएँ, डिजिटल मेनू साझा करें और WhatsApp ऑर्डर लें। QR24x7 पर अपने व्यवसाय का पेज कुछ मिनटों में तैयार करें।"
  },
  "/features": {
    en: "Explore QR24x7 features for Google reviews, private feedback, digital menus, WhatsApp orders, business pages, QR and NFC stands, and clear activity reports.",
    hi: "Google रिव्यू, निजी फ़ीडबैक, डिजिटल मेनू, WhatsApp ऑर्डर, बिज़नेस पेज, QR और NFC स्टैंड की सुविधाएँ देखें। गतिविधियों की रिपोर्ट भी एक जगह पाएँ।"
  },
  "/how-it-works": {
    en: "Set up a QR24x7 page, add your review link and menu, then let customers scan or tap. Follow reviews, scans, enquiries and WhatsApp orders from one app.",
    hi: "QR24x7 पेज बनाएँ, रिव्यू लिंक और मेनू जोड़ें, फिर ग्राहकों को स्कैन या टैप करने दें। एक ही ऐप में रिव्यू, स्कैन, पूछताछ और WhatsApp ऑर्डर देखें।"
  },
  "/pricing": {
    en: "Compare QR24x7 plans for Google reviews, digital menus and WhatsApp orders. See current prices, choose a billing period and pay in INR with UPI.",
    hi: "Google रिव्यू, डिजिटल मेनू और WhatsApp ऑर्डर के लिए QR24x7 प्लान की तुलना करें। मौजूदा कीमत देखें, अवधि चुनें और UPI से INR में भुगतान करें।"
  },
  "/about": {
    en: "Learn why QR24x7 brings Google reviews, private customer feedback and useful business links together for small businesses across India. Built for local teams.",
    hi: "जानें कि QR24x7 भारत के छोटे व्यवसायों के लिए Google रिव्यू, निजी ग्राहक फ़ीडबैक और उपयोगी बिज़नेस लिंक को एक जगह क्यों लाता है। अपने ग्राहकों से बेहतर जुड़ें।"
  },
  "/demo": {
    en: "Try the QR24x7 customer review page on your phone. Scan the demo QR, tap a star, share private feedback and open the public review link in a live phone browser.",
    hi: "ग्राहक रिव्यू पेज आज़माएँ। डेमो QR स्कैन करें, स्टार चुनें, निजी फ़ीडबैक दें और सार्वजनिक रिव्यू लिंक खोलें। पेज फ़ोन ब्राउज़र में खुलता है, ऐप की ज़रूरत नहीं।"
  },
  "/privacy": {
    en: "Read how QR24x7 collects, uses, stores and protects account, business, review, usage and payment information, along with the choices available to you.",
    hi: "पढ़ें कि QR24x7 खाते, व्यवसाय, रिव्यू, उपयोग और भुगतान की जानकारी कैसे लेता, उपयोग करता और सुरक्षित रखता है, और आपके पास कौन से विकल्प हैं। अपने अधिकार जानें।"
  },
  "/terms": {
    en: "Review the terms for using QR24x7, including accounts, acceptable use, subscriptions, billing, intellectual property, liability and governing law.",
    hi: "QR24x7 उपयोग की शर्तें पढ़ें। इसमें खाते, स्वीकार्य उपयोग, सदस्यता, बिलिंग, बौद्धिक संपदा, दायित्व और लागू कानून शामिल हैं, साथ ही आपकी ज़िम्मेदारियाँ भी।"
  },
  "/refund": {
    en: "Understand QR24x7 subscription cancellations, the first-time purchase guarantee, renewal refunds and how to contact us about a billing request.",
    hi: "QR24x7 सदस्यता रद्द करने, पहली खरीद की गारंटी, रिन्यूअल रिफंड और बिलिंग अनुरोध के लिए हमसे संपर्क करने का तरीका जानें। बिलिंग सहायता भी पाएँ।"
  },
  "/reseller-terms": {
    en: "Read QR24x7 reseller terms for eligible commissions, payout details, approval, reversals and responsible promotion of the service for the India market.",
    hi: "QR24x7 रीसेलर की शर्तें पढ़ें। इसमें योग्य कमीशन, पेआउट, मंज़ूरी, रिवर्सल और सेवा के ज़िम्मेदार प्रचार की जानकारी है। अपने काम के नियम जानें।"
  }
};

export function publicLocalePath(path: string, locale: SeoLocale): string {
  const clean = path === "/" ? "" : `/${path.split("/").filter(Boolean).join("/")}`;
  const withoutLocale = clean.replace(/^\/hi(?=\/|$)/, "");
  if (locale === "hi") return withoutLocale ? `/hi${withoutLocale}` : "/hi";
  return withoutLocale || "/";
}

function siteOrigin() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || "https://qr24x7.in";
  try { return new URL(raw).origin; } catch { return "https://qr24x7.in"; }
}

function absolute(path: string) {
  return new URL(path, `${siteOrigin()}/`).toString();
}

function applyTitleTemplate(title: string, template: string) {
  const result = template.includes("%s") ? template.replaceAll("%s", title) : `${title} | QR24x7`;
  const normalized = result.replace(/\s+/g, " ").trim();
  if (normalized.length <= 60) return normalized;
  let shortened = "";
  for (const character of Array.from(normalized)) {
    if ((shortened + character + "…").length > 60) break;
    shortened += character;
  }
  return `${shortened.trimEnd()}…`;
}

export async function buildSeoMetadata(input: SeoPageInput, config?: SeoConfig): Promise<Metadata> {
  const seo = config || await getSeoConfig();
  const locale = input.locale || "en";
  const path = publicLocalePath(input.path, locale);
  const override = seo.overrides[path];
  const pageTitle = override?.title || input.title;
  const title = applyTitleTemplate(pageTitle, seo.defaultTitleTemplate);
  const description = override?.description || input.description || (locale === "hi" ? seo.defaultDescriptionHi : seo.defaultDescriptionEn);
  const image = override?.ogImageUrl || input.image || seo.defaultOgImageUrl;
  const canonicalUrl = absolute(path);
  const alternateEnabled = input.translated !== false;
  const languages = alternateEnabled ? {
    "en-IN": absolute(publicLocalePath(input.path, "en")),
    "hi-IN": absolute(publicLocalePath(input.path, "hi")),
    "x-default": absolute(publicLocalePath(input.path, "en"))
  } : undefined;
  const twitterHandle = seo.twitterHandle ? (seo.twitterHandle.startsWith("@") ? seo.twitterHandle : `@${seo.twitterHandle}`) : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl, ...(languages ? { languages } : {}) },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title,
      description,
      siteName: "QR24x7",
      locale: locale === "hi" ? "hi_IN" : "en_IN",
      ...(locale === "hi" ? { alternateLocale: ["en_IN"] } : { alternateLocale: ["hi_IN"] }),
      images: [{ url: image, width: 1200, height: 630, alt: title }]
    },
    twitter: { card: "summary_large_image", title, description, images: [image], ...(twitterHandle ? { site: twitterHandle, creator: twitterHandle } : {}) },
    robots: override?.noindex ? { index: false, follow: true } : { index: true, follow: true }
  };
}

export function evaluateSeoChecklist(rows: SeoChecklistInput[]): SeoChecklistResult[] {
  return rows.map((row) => {
    const titleLength = row.title.trim().length;
    const descriptionLength = row.description.trim().length;
    const expectedCanonical = absolute(publicLocalePath(row.path, row.locale));
    const canonicalMatches = normalizeCanonicalUrl(row.canonical || "") === normalizeCanonicalUrl(expectedCanonical);
    const add = (key: string, label: string, ok: boolean, detail: string) => ({ key, label, status: ok ? "pass" as const : "warn" as const, detail });
    return {
      path: publicLocalePath(row.path, row.locale),
      locale: row.locale,
      checks: [
        add("title", "Title length", titleLength >= 25 && titleLength <= 60, `${titleLength} characters (target 25–60)`),
        add("description", "Description length", descriptionLength >= 140 && descriptionLength <= 160, `${descriptionLength} characters (target 140–160)`),
        add("canonical", "Canonical", canonicalMatches, canonicalMatches ? "Self canonical is set" : row.canonical ? "Canonical does not match this page" : "Canonical is missing"),
        add("hreflang", "Hreflang", row.hreflangExpected === false || row.hasHreflang, row.hreflangExpected === false ? "Not applicable; no full translation exists" : row.hasHreflang ? "Locale alternates are set" : "Locale alternates are missing"),
        add("h1", "H1 count", !row.fetchError && row.h1Count === 1, row.fetchError ? "Page could not be fetched; H1 count unavailable" : `${row.h1Count} H1 tags (expected 1)`)
      ]
    };
  });
}

function normalizeCanonicalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    return url.href;
  } catch {
    return value.trim();
  }
}

function htmlAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function decodeHtml(value: string): string {
  return value.replace(/&(?:amp|quot|apos|#39|lt|gt);|&#(?:x[\da-f]+|\d+);/gi, (entity) => {
    const named: Record<string, string> = { "&amp;": "&", "&quot;": "\"", "&apos;": "'", "&#39;": "'", "&lt;": "<", "&gt;": ">" };
    const direct = named[entity.toLowerCase()];
    if (direct) return direct;
    const code = entity.toLowerCase().startsWith("&#x") ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
  });
}

function renderedMetadata(html: string) {
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] || "";
  let description = "";
  let canonical = "";
  const alternateLanguages = new Set<string>();
  for (const tag of html.match(/<(?:meta|link)\b[^>]*>/gi) || []) {
    const tagName = tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
    if (tagName === "meta" && htmlAttribute(tag, "name")?.toLowerCase() === "description") {
      description = htmlAttribute(tag, "content") || "";
    }
    if (tagName !== "link") continue;
    const rel = htmlAttribute(tag, "rel")?.toLowerCase().split(/\s+/) || [];
    if (rel.includes("canonical")) canonical = htmlAttribute(tag, "href") || "";
    if (rel.includes("alternate")) {
      const language = htmlAttribute(tag, "hreflang")?.toLowerCase();
      if (language) alternateLanguages.add(language);
    }
  }
  return {
    title: decodeHtml(title.replace(/<[^>]*>/g, "")).trim(),
    description: decodeHtml(description).trim(),
    canonical,
    hasHreflang: ["en-in", "hi-in", "x-default"].every((language) => alternateLanguages.has(language)),
    h1Count: (html.match(/<h1\b[^>]*>/gi) || []).length
  };
}

/** Fetch public HTML with bounded concurrency so the admin checklist audits real rendered output. */
export async function fetchRenderedSeoChecklist(routes: SeoChecklistRoute[], concurrency = 8): Promise<SeoChecklistResult[]> {
  const origin = siteOrigin();
  const inputs: SeoChecklistInput[] = new Array(routes.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= routes.length) return;
      const route = routes[index];
      try {
        const path = publicLocalePath(route.path, route.locale);
        const response = await fetch(new URL(path, `${origin}/`), {
          cache: "no-store",
          headers: { "user-agent": "QR24x7-SEO-Checklist/1.0" },
          signal: AbortSignal.timeout(2500)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        inputs[index] = { ...route, ...renderedMetadata(await response.text()) };
      } catch {
        inputs[index] = { ...route, title: "", description: "", canonical: "", hasHreflang: false, h1Count: 0, fetchError: true };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), routes.length) }, worker));
  return evaluateSeoChecklist(inputs);
}

export function buildOrganizationJsonLd(seo: SeoConfig, url = siteOrigin()) {
  const org = seo.organization;
  const address = [org.addressLocality, org.addressRegion, org.postalCode].filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "QR24x7",
    legalName: org.legalName,
    url,
    logo: absolute(org.logoUrl || "/brand/logo-mark.png"),
    ...(org.phone ? { telephone: org.phone } : {}),
    ...(org.email ? { email: org.email } : {}),
    ...(address.length ? { address: { "@type": "PostalAddress", ...(org.addressLocality ? { addressLocality: org.addressLocality } : {}), ...(org.addressRegion ? { addressRegion: org.addressRegion } : {}), ...(org.postalCode ? { postalCode: org.postalCode } : {}), addressCountry: "IN" } } : {}),
    sameAs: org.sameAs
  };
}

export function buildWebsiteJsonLd(locale: SeoLocale = "en", url = siteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "QR24x7",
    url: locale === "hi" ? absolute("/hi") : url,
    inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
    potentialAction: { "@type": "SearchAction", target: `${url}/plans/{search_term_string}`, "query-input": "required name=search_term_string" }
  };
}

export function buildSoftwareApplicationJsonLd(lowestPricePaise: number | null, locale: SeoLocale = "en", url = siteOrigin()) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "QR24x7",
    operatingSystem: "Android, Web",
    applicationCategory: "BusinessApplication",
    inLanguage: locale === "hi" ? "hi-IN" : "en-IN",
    url: locale === "hi" ? absolute("/hi") : url,
    offers: lowestPricePaise == null ? undefined : {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (lowestPricePaise / 100).toFixed(2),
      category: "subscription"
    }
  };
}

export function jsonLdString(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function routeDescription(path: string, locale: SeoLocale) {
  const base = path.replace(/^\/hi(?=\/|$)/, "") || "/";
  return ROUTE_DESCRIPTIONS[base]?.[locale === "hi" ? "hi" : "en"];
}


export function planSeoDescription(name: string, description: string, locale: SeoLocale) {
  const provided = description.trim();
  if (provided.length >= 140 && provided.length <= 160) return provided;
  const shortName = Array.from(name.trim()).slice(0, 16).join("").trim();
  return locale === "hi"
    ? `QR24x7 के ${shortName} प्लान में Google रिव्यू, डिजिटल मेनू और WhatsApp ऑर्डर मिलते हैं। सुविधाएँ, INR कीमत और अवधि देखकर अपने व्यवसाय के लिए विकल्प चुनें।`
    : `See the ${shortName} plan at QR24x7 for Google reviews, menus and WhatsApp orders. Compare its tools, INR prices and billing periods for your business.`;
}

function joinSeoModules(labels: string[], locale: SeoLocale) {
  if (labels.length < 2) return labels[0] || "";
  if (locale === "hi") return `${labels.slice(0, -1).join(", ")} और ${labels[labels.length - 1]}`;
  if (labels.length === 2) return labels.join(" & ");
  return `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
}

function fitSeoTitlePart(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 0) return "";
  if (maxLength === 1) return "…";
  let result = "";
  for (const character of Array.from(value)) {
    if ((result + character + "…").length > maxLength) break;
    result += character;
  }
  return `${result.trimEnd()}…`;
}

/** Build a descriptive plan title from only the modules included in the plan. */
export function planSeoTitle(name: string, modules: readonly string[], locale: SeoLocale) {
  const labels = locale === "hi"
    ? { REVIEWS: "Google रिव्यू", MENU: "मेनू", STORE: "WhatsApp ऑर्डर" }
    : { REVIEWS: "Google Reviews", MENU: "Menu", STORE: "WhatsApp Orders" };
  const compactLabels = locale === "hi"
    ? { REVIEWS: "रिव्यू", MENU: "मेनू", STORE: "WhatsApp" }
    : { REVIEWS: "Reviews", MENU: "Menu", STORE: "WA Orders" };
  const moduleIds = ["REVIEWS", "MENU", "STORE"] as const;
  const present = moduleIds.filter((id) => modules.includes(id));
  const planWord = locale === "hi" ? "प्लान" : "Plan";
  const trimmedName = name.trim();
  const makeTitle = (moduleLabels: Record<(typeof moduleIds)[number], string>) => {
    const moduleText = joinSeoModules(present.map((id) => moduleLabels[id]), locale);
    return `${trimmedName} ${planWord}${moduleText ? `: ${moduleText}` : ""}`;
  };

  const maxTitleLength = 51; // Leaves room for the default " | QR24x7" title suffix.
  const fullTitle = makeTitle(labels);
  if (fullTitle.length <= maxTitleLength) return fullTitle;

  const compactTitle = makeTitle(compactLabels);
  if (compactTitle.length <= maxTitleLength) return compactTitle;

  const moduleText = joinSeoModules(present.map((id) => compactLabels[id]), locale);
  const fixedTitle = `${planWord}${moduleText ? `: ${moduleText}` : ""}`;
  const nameLength = maxTitleLength - fixedTitle.length - 1;
  return `${fitSeoTitlePart(trimmedName, nameLength)} ${fixedTitle}`.trim();
}

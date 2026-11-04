import { getSeoConfig } from "@/lib/settings";
import { listActivePlanPrices } from "@/lib/plans/public";
import { buildOrganizationJsonLd, buildSoftwareApplicationJsonLd, buildWebsiteJsonLd, jsonLdString, type SeoLocale } from "@/lib/seo";
import type { PricingFaq } from "@/lib/plans/pricing-copy";

export async function HomeStructuredData({ locale = "en", faqs = [] }: { locale?: SeoLocale; faqs?: PricingFaq[] }) {
  const [seo, plans] = await Promise.all([getSeoConfig(), listActivePlanPrices().catch(() => [])]);
  const prices = plans.flatMap((plan) => plan.prices.map((price) => price.pricePaise));
  const lowest = prices.length ? Math.min(...prices) : null;
  const faqItems = faqs.map((faq) => ({
    "@type": "Question",
    name: locale === "hi" ? faq.qHi : faq.qEn,
    acceptedAnswer: { "@type": "Answer", text: locale === "hi" ? faq.aHi : faq.aEn }
  }));
  const graph = [
    buildOrganizationJsonLd(seo),
    buildWebsiteJsonLd(locale),
    buildSoftwareApplicationJsonLd(lowest, locale),
    { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: locale === "hi" ? "hi-IN" : "en-IN", mainEntity: faqItems }
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(graph) }} />;
}

export function FaqStructuredData({ faqs, locale = "en" }: { faqs: PricingFaq[]; locale?: SeoLocale }) {
  const items = faqs.map((faq) => ({
    "@type": "Question",
    name: locale === "hi" ? faq.qHi : faq.qEn,
    acceptedAnswer: { "@type": "Answer", text: locale === "hi" ? faq.aHi : faq.aEn }
  }));
  const data = { "@context": "https://schema.org", "@type": "FAQPage", inLanguage: locale === "hi" ? "hi-IN" : "en-IN", mainEntity: items };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}

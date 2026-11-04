import type { Metadata } from "next";
import { FAQList, PricingCards } from "@/components/marketing/qr-site/pricing";
import { FaqStructuredData } from "@/components/marketing/qr-site/structured-data";
import { PlanComparison } from "@/components/marketing/qr-site/plan-comparison";
import { PageIntro, SiteShell } from "@/components/marketing/qr-site/ui";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingCopy } from "@/lib/plans/pricing-copy";
import { buildSeoMetadata, routeDescription, SEO_STATIC_ROUTES } from "@/lib/seo";
import { LocalizedCopy } from "@/components/marketing/qr-site/i18n";
import { getRequestLocale } from "@/lib/locale";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({ path: "/pricing", title: SEO_STATIC_ROUTES[3].titleEn, description: routeDescription("/pricing", "en") });
}

export default async function PricingPage() {
  const locale = getRequestLocale();
  const [catalog, legacy, brand, copy] = await Promise.all([
    listPublicPlans(),
    getPricingConfig(),
    getBrand(),
    getPricingCopy()
  ]);
  return (
    <SiteShell brand={brand} locale={locale} path="/pricing">
      <LocalizedCopy locale={locale}><>
      <FaqStructuredData faqs={copy.faqs} locale={locale} />
      <PageIntro eyebrow="Plans for every stage" title="Clear pricing for your reviews, digital menu and WhatsApp orders." description="Choose the QR24x7 tools your business needs. Current plans and prices are set in the plan catalog." />
      <PricingCards plans={catalog} legacy={legacy} locale={locale} title="Choose a plan" description="Select a plan and a billing duration. Checkout uses the price saved for that plan." />
      <PlanComparison plans={catalog} locale={locale} />
      <FAQList faqs={copy.faqs} title="Pricing questions" locale={locale} />
      </></LocalizedCopy>
    </SiteShell>
  );
}

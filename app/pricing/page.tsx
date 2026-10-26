import { MarketingNavbar } from "@/components/marketing/navbar";
import { PlanPricing } from "@/components/marketing/plan-pricing";
import { PlanCompare } from "@/components/marketing/plan-compare";
import { PricingFaqBlock } from "@/components/marketing/pricing-faq";
import { Pricing } from "@/components/marketing/pricing";
import { Footer } from "@/components/marketing/footer";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingCopy } from "@/lib/plans/pricing-copy";
import { marketingFontClass } from "@/components/brand/fonts";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [catalog, legacy, brand, copy] = await Promise.all([
    listPublicPlans(),
    getPricingConfig(),
    getBrand(),
    getPricingCopy()
  ]);
  return (
    <LandingLangProvider>
      <main className={`marketing-page min-h-screen ${marketingFontClass}`}>
        <MarketingNavbar brand={brand} />
        {catalog.length > 0 ? <PlanPricing plans={catalog} /> : <Pricing plans={legacy} />}
        {catalog.length > 0 ? <PlanCompare plans={catalog} /> : null}
        <PricingFaqBlock faqs={copy.faqs} />
        <Footer brand={brand} />
      </main>
    </LandingLangProvider>
  );
}

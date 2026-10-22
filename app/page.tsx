import { MarketingNavbar } from "@/components/marketing/navbar";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Pricing } from "@/components/marketing/pricing";
import { PlanPricing } from "@/components/marketing/plan-pricing";
import { Footer } from "@/components/marketing/footer";
import { HeroV2 } from "@/components/marketing/landing/hero-v2";
import { AnchorPill } from "@/components/marketing/landing/anchor-pill";
import {
  ProductSuite,
  HowItWorksV2,
  TapPageShowcase,
  StoreShowcase,
  ReviewsShowcase,
  ProductsShowcase,
  GrowthTools,
  Industries,
  Comparison,
  FaqV2,
  CtaV2
} from "@/components/marketing/landing/sections";
import { getPricingConfig } from "@/lib/settings";
import { listPublicPlans } from "@/lib/plans/public";
import { getBrand } from "@/lib/brand";
import { marketingFontClass } from "@/components/brand/fonts";
import { priceAnchor } from "@/lib/landing/anchor";
import { talkToUsHref } from "@/lib/landing/money";
import { landingTrust } from "@/lib/landing/proof";
import { LandingLangProvider } from "@/components/marketing/landing-v2/lang";
import { SellHero, StickyBuy } from "@/components/marketing/landing-v2/sell-hero";
import { ProductGrid } from "@/components/marketing/landing-v2/product-grid";
import { listStandAddons } from "@/lib/landing/hardware";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, catalog, brand, trust, hardware] = await Promise.all([
    getPricingConfig(),
    listPublicPlans(),
    getBrand(),
    landingTrust(),
    listStandAddons()
  ]);
  const anchor = priceAnchor(catalog);
  const whatsapp = talkToUsHref();
  return (
    <LandingLangProvider>
    <main className={`marketing-page relative min-h-screen overflow-x-hidden pb-24 ${marketingFontClass}`}>
      <link rel="preload" as="image" href="/landing/hero-800.webp" media="(max-width: 767px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/landing/hero-1600.webp" media="(min-width: 768px)" fetchPriority="high" />
      <MarketingNavbar brand={brand} />

      <SellHero anchor={anchor} trust={trust} whatsapp={whatsapp} />
      <StickyBuy anchor={anchor} whatsapp={whatsapp} />
      <ProductGrid plans={catalog} hardware={hardware} />
      <HeroV2 />
      <ProductSuite />
      <HowItWorksV2 />
      <TapPageShowcase />
      <StoreShowcase />
      <ReviewsShowcase />
      <ProductsShowcase />
      <GrowthTools />
      <div className="marketing-band">
        <DashboardPreview />
      </div>
      <Industries />
      <Comparison />
      <div className="marketing-band">
        {catalog.length > 0 ? <PlanPricing plans={catalog} sectionId="plans-list" /> : <Pricing plans={plans} sectionId="plans-list" />}
      </div>
      <FaqV2 />
      <CtaV2 />

      <Footer brand={brand} />
      <AnchorPill />
    </main>
    </LandingLangProvider>
  );
}

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

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, catalog, brand] = await Promise.all([getPricingConfig(), listPublicPlans(), getBrand()]);
  return (
    <main className={`marketing-page relative min-h-screen overflow-x-hidden pb-24 ${marketingFontClass}`}>
      <MarketingNavbar brand={brand} />

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
        {catalog.length > 0 ? <PlanPricing plans={catalog} /> : <Pricing plans={plans} />}
      </div>
      <FaqV2 />
      <CtaV2 />

      <Footer brand={brand} />
      <AnchorPill />
    </main>
  );
}

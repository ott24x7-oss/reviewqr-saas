import { MarketingNavbar } from "@/components/marketing/navbar";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Pricing } from "@/components/marketing/pricing";
import { Footer } from "@/components/marketing/footer";
import { HeroV2 } from "@/components/marketing/landing/hero-v2";
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
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, brand] = await Promise.all([getPricingConfig(), getBrand()]);
  return (
    <main className="relative min-h-screen overflow-x-hidden" style={{ "--accent": "#2BAE69" } as any}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-slate-400/20" />

      <MarketingNavbar brand={brand} />

      <div className="mx-auto w-full max-w-6xl space-y-4 px-3 py-5 sm:space-y-6 sm:px-4 sm:py-8">
        <HeroV2 />
        <ProductSuite />
        <HowItWorksV2 />
        <TapPageShowcase />
        <StoreShowcase />
        <ReviewsShowcase />
        <ProductsShowcase />
        <GrowthTools />
        <section className="scroll-mt-24 overflow-hidden rounded-[1.75rem] neu sm:rounded-[2rem]">
          <DashboardPreview />
        </section>
        <Industries />
        <Comparison />
        <section className="scroll-mt-24 overflow-hidden rounded-[1.75rem] neu sm:rounded-[2rem]">
          <Pricing plans={plans} />
        </section>
        <FaqV2 />
        <CtaV2 />
      </div>

      <Footer brand={brand} />
    </main>
  );
}

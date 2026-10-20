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
import { marketingFontClass } from "@/components/brand/fonts";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [plans, brand] = await Promise.all([getPricingConfig(), getBrand()]);
  return (
    <main className={`marketing-page relative min-h-screen overflow-x-hidden ${marketingFontClass}`}>
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
      <nav className="marketing-anchor" aria-label="On this page">
        <a href="#features">Features</a>
        <a href="#store">Store</a>
        <a href="#products">QR+NFC</a>
        <a href="#pricing">Pricing</a>
      </nav>
    </main>
  );
}

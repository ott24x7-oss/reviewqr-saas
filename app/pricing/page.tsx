import { MarketingNavbar } from "@/components/marketing/navbar";
import { PlanPricing } from "@/components/marketing/plan-pricing";
import { Pricing } from "@/components/marketing/pricing";
import { Footer } from "@/components/marketing/footer";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { marketingFontClass } from "@/components/brand/fonts";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [catalog, legacy, brand] = await Promise.all([listPublicPlans(), getPricingConfig(), getBrand()]);
  return (
    <main className={`marketing-page min-h-screen ${marketingFontClass}`}>
      <MarketingNavbar brand={brand} />
      {catalog.length > 0 ? <PlanPricing plans={catalog} /> : <Pricing plans={legacy} />}
      <Footer brand={brand} />
    </main>
  );
}

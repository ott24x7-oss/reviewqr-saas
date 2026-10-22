import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { PlanPricing } from "@/components/marketing/plan-pricing";
import { Pricing } from "@/components/marketing/pricing";
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
  Industries
} from "@/components/marketing/landing/sections";
import type { PublicPlan } from "@/lib/plans/public";
import type { getPricingConfig } from "@/lib/settings";

type LegacyPlans = Awaited<ReturnType<typeof getPricingConfig>>;

/** The original landing story, moved whole from the home page. Anchors stay on these sections. */
export function FeatureStory({ catalog, legacy }: { catalog: PublicPlan[]; legacy: LegacyPlans }) {
  return (
    <>
      <div id="story">
        <HeroV2 />
      </div>
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
      <div className="marketing-band">
        {catalog.length > 0 ? (
          <PlanPricing plans={catalog} sectionId="plans-list" />
        ) : (
          <Pricing plans={legacy} sectionId="plans-list" />
        )}
      </div>
      <AnchorPill
        links={[
          { href: "#features", label: "Features" },
          { href: "#store", label: "Store" },
          { href: "#products", label: "QR+NFC" },
          { href: "/#pricing", label: "Pricing" }
        ]}
      />
    </>
  );
}

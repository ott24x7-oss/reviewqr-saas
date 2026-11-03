import { FAQList, PricingCards } from "@/components/marketing/qr-site/pricing";
import { PlanComparison } from "@/components/marketing/qr-site/plan-comparison";
import { PageIntro, SiteShell } from "@/components/marketing/qr-site/ui";
import { getPricingConfig } from "@/lib/settings";
import { getBrand } from "@/lib/brand";
import { listPublicPlans } from "@/lib/plans/public";
import { getPricingCopy } from "@/lib/plans/pricing-copy";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const [catalog, legacy, brand, copy] = await Promise.all([
    listPublicPlans(),
    getPricingConfig(),
    getBrand(),
    getPricingCopy()
  ]);
  return (
    <SiteShell brand={brand}>
      <PageIntro eyebrow="Plans for every stage" title="Clear pricing for your reviews, digital menu and WhatsApp orders." description="Choose the QR24x7 tools your business needs. Current plans and prices are set in the plan catalog." />
      <PricingCards plans={catalog} legacy={legacy} title="Choose a plan" description="Select a plan and a billing duration. Checkout uses the price saved for that plan." />
      <PlanComparison plans={catalog} />
      <FAQList faqs={copy.faqs} title="Pricing questions" />
    </SiteShell>
  );
}

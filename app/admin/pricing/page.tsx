import { getPricingConfig } from "@/lib/settings";
import { getPricingCopy } from "@/lib/plans/pricing-copy";
import { PricingForm } from "./pricing-form";
import { PricingCopyForm } from "./pricing-copy-form";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const [plans, copy] = await Promise.all([getPricingConfig(), getPricingCopy()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Pricing & plans</h1>
        <p className="text-sm text-muted-foreground">
          Edit plan prices, features, and limits. Changes apply immediately to the marketing page,
          billing checkout, and plan-limit enforcement.
        </p>
        <p className="text-sm text-muted-foreground">
          Module plans, bullets, images, and who is on the pricing page are edited under Plans.
          The questions and sticker comparison below are what the public pages show.
        </p>
      </div>
      <PricingForm initial={plans} />
      <PricingCopyForm initial={copy} />
    </div>
  );
}

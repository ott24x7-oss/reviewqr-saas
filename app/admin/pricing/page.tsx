import { getPricingConfig } from "@/lib/settings";
import { PricingForm } from "./pricing-form";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const plans = await getPricingConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Pricing & plans</h1>
        <p className="text-sm text-muted-foreground">
          Edit plan prices, features, and limits. Changes apply immediately to the marketing page,
          billing checkout, and plan-limit enforcement.
        </p>
      </div>
      <PricingForm initial={plans} />
    </div>
  );
}

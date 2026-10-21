import { maskSecret } from "@/lib/admin";
import { getShippingConfig } from "@/lib/settings";
import { adminCarrierState } from "@/lib/shop/shipping";
import { ShippingForm } from "./shipping-form";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const config = await getShippingConfig();
  const status = adminCarrierState(config, process.env.NODE_ENV);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Shipping</h1>
        <p className="text-sm text-muted-foreground">
          Shiprocket and Delhivery book live shipments only after their keys are saved. Development uses the mock carrier.
        </p>
      </div>
      <p className="rounded-[20px] bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm">{status}</p>
      <ShippingForm
        status={status}
        initial={{
          ...config,
          shiprocketPassword: maskSecret(config.shiprocketPassword),
          delhiveryToken: maskSecret(config.delhiveryToken),
          webhookSecret: maskSecret(config.webhookSecret)
        }}
      />
    </div>
  );
}

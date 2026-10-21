import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import type { WeekHours } from "@/lib/tap/hours";
import { StoreForm, type StoreFormValues } from "./store-form";

export const dynamic = "force-dynamic";

export default async function StoreSettingsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await requireBusinessRole(user.id, params.id, "read");
  if (!access) notFound();
  const settings = await prisma.storeSettings.findUnique({ where: { businessId: access.id } });
  const initial: StoreFormValues = {
    holiday: settings?.holiday ?? false,
    hours: (settings?.hours as WeekHours | null) ?? null,
    dineIn: settings?.dineIn ?? true,
    takeaway: settings?.takeaway ?? true,
    delivery: settings?.delivery ?? false,
    deliveryPincodes: settings?.deliveryPincodes ?? "",
    deliveryChargeRupees: (settings?.deliveryChargePaise ?? 0) / 100,
    freeDeliveryAboveRupees: settings?.freeDeliveryAbovePaise == null ? null : settings.freeDeliveryAbovePaise / 100,
    minOrderRupees: (settings?.minOrderPaise ?? 0) / 100,
    packingChargeRupees: (settings?.packingChargePaise ?? 0) / 100,
    gstEnabled: settings?.gstEnabled ?? false,
    gstPercent: settings?.gstPercent ?? 5,
    pricesIncludeGst: settings?.pricesIncludeGst ?? true,
    prepMinutes: settings?.prepMinutes ?? 20,
    upiId: settings?.upiId ?? "",
    layout: settings?.layout ?? "AUTO"
  };
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold sm:text-2xl">Store settings</h1>
        <p className="text-sm text-muted-foreground">{access.name}</p>
      </div>
      {access.accessRole === "STAFF" ? (
        <p className="text-sm text-muted-foreground">Only a manager can change store settings.</p>
      ) : (
        <StoreForm businessId={access.id} initial={initial} />
      )}
    </div>
  );
}

import { ShopCheckoutSettings } from "@/components/admin/shop-checkout-settings";
import { requireAdminPage } from "@/lib/admin";
import { loadAdminCatalogue } from "@/lib/admin/catalogue";
import { CatalogBoard } from "./catalog-board";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  await requireAdminPage();
  const { products, checkout, lowStockCount } = await loadAdminCatalogue();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Product catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Hardware owners buy from QR24x7. Prices are GST-inclusive. {lowStockCount} variant{lowStockCount === 1 ? "" : "s"} at or below the low-stock level.
        </p>
      </div>
      <ShopCheckoutSettings
        codEnabled={checkout.codEnabled}
        codAdvancePercent={checkout.codAdvancePercent}
        commissionPercent={checkout.commissionPercent}
      />
      <CatalogBoard products={products} />
    </div>
  );
}

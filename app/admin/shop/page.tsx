import { ShopCheckoutSettings } from "@/components/admin/shop-checkout-settings";
import { requireAdminPage } from "@/lib/admin";
import { getShopCheckoutConfig } from "@/lib/settings";
import { isLowStock } from "@/lib/shop/catalog";
import { listCatalog } from "@/lib/shop/catalog-store";
import { CatalogBoard } from "./catalog-board";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  await requireAdminPage();
  const [products, checkout] = await Promise.all([listCatalog(), getShopCheckoutConfig()]);
  const low = products.flatMap((product) =>
    product.variants.filter((variant) => variant.active && isLowStock(variant.stock, variant.lowStockAt))
  );
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Product catalogue</h1>
        <p className="text-sm text-muted-foreground">
          Hardware owners buy from ReviewQR. Prices are GST-inclusive. {low.length} variant{low.length === 1 ? "" : "s"} at or below the low-stock level.
        </p>
      </div>
      <ShopCheckoutSettings
        codEnabled={checkout.codEnabled}
        codAdvancePercent={checkout.codAdvancePercent}
        commissionPercent={checkout.commissionPercent}
      />
      <CatalogBoard
        products={products.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          nameHi: product.nameHi,
          description: product.description,
          descriptionHi: product.descriptionHi,
          needsNfc: product.needsNfc,
          needsDesign: product.needsDesign,
          defaultTemplateId: product.defaultTemplateId,
          active: product.active,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            salePaise: variant.salePaise,
            mrpPaise: variant.mrpPaise,
            costPaise: variant.costPaise,
            hsn: variant.hsn,
            gstPercent: variant.gstPercent,
            weightGrams: variant.weightGrams,
            lengthMm: variant.lengthMm,
            widthMm: variant.widthMm,
            heightMm: variant.heightMm,
            stock: variant.stock,
            lowStockAt: variant.lowStockAt,
            minQty: variant.minQty,
            active: variant.active,
            low: isLowStock(variant.stock, variant.lowStockAt)
          }))
        }))}
      />
    </div>
  );
}

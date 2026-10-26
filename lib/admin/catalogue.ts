import { getShopCheckoutConfig } from "@/lib/settings";
import { isLowStock } from "@/lib/shop/catalog";
import { listCatalog } from "@/lib/shop/catalog-store";

export async function loadAdminCatalogue() {
  const [products, checkout] = await Promise.all([listCatalog(), getShopCheckoutConfig()]);
  const lowStockCount = products.reduce((total, product) => total + product.variants.filter((variant) => variant.active && isLowStock(variant.stock, variant.lowStockAt)).length, 0);
  return {
    lowStockCount,
    checkout,
    products: products.map((product) => ({
      id: product.id, slug: product.slug, name: product.name, nameHi: product.nameHi,
      description: product.description, descriptionHi: product.descriptionHi, needsNfc: product.needsNfc,
      needsDesign: product.needsDesign, defaultTemplateId: product.defaultTemplateId, active: product.active,
      variants: product.variants.map((variant) => ({
        id: variant.id, sku: variant.sku, name: variant.name, salePaise: variant.salePaise,
        mrpPaise: variant.mrpPaise, costPaise: variant.costPaise, hsn: variant.hsn,
        gstPercent: variant.gstPercent, weightGrams: variant.weightGrams, lengthMm: variant.lengthMm,
        widthMm: variant.widthMm, heightMm: variant.heightMm, stock: variant.stock,
        lowStockAt: variant.lowStockAt, minQty: variant.minQty, imageUrl: variant.imageUrl,
        active: variant.active, low: isLowStock(variant.stock, variant.lowStockAt)
      }))
    }))
  };
}

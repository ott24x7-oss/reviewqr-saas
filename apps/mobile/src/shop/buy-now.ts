import type { ShopProduct } from "@reviewqr/shared";

export type BuyNowFlow = { mode: "direct" | "sheet"; sku: string; qty: number } | null;

/** Products with design, NFC, or variant choices need the product sheet first. */
export function buyNowFlow(product: {
  needsDesign: boolean;
  needsNfc: boolean;
  variants: Pick<ShopProduct["variants"][number], "sku" | "minQty">[];
}): BuyNowFlow {
  const variant = product.variants[0];
  if (!variant) return null;
  return {
    mode: product.variants.length > 1 || product.needsDesign || product.needsNfc ? "sheet" : "direct",
    sku: variant.sku,
    qty: Math.max(1, variant.minQty)
  };
}

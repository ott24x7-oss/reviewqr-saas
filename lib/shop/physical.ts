export type ShopCategory = "stand" | "card" | "sticker" | "keychain" | "digital";

type VariantBits = {
  ships: boolean;
  includedLifetime: boolean;
  includedTier?: string | null;
};

/** Digital when the SKU is a plan, or nothing ships. Combo hardware stays a stand. */
export function shopCategory(product: { slug: string; name: string; variants: VariantBits[] }): ShopCategory {
  const variants = product.variants;
  const digital =
    variants.some((variant) => variant.includedLifetime || Boolean(variant.includedTier)) ||
    (variants.length > 0 && variants.every((variant) => variant.ships === false));
  if (digital) return "digital";
  const hay = `${product.slug} ${product.name}`.toLowerCase();
  if (hay.includes("combo") || hay.includes("stand")) return "stand";
  if (hay.includes("sticker")) return "sticker";
  if (hay.includes("card")) return "card";
  if (hay.includes("keychain") || hay.includes("key-chain")) return "keychain";
  return "stand";
}

export function isPhysicalShopProduct(product: { slug: string; name: string; variants: VariantBits[] }) {
  return shopCategory(product) !== "digital";
}

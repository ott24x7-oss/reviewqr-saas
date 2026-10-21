import { ShopGrid } from "@/components/shop/shop-grid";
import { shopCatalog } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await shopCatalog();
  return <ShopGrid products={products} />;
}

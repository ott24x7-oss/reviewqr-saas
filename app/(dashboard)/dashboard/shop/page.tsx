import { ShopGrid } from "@/components/shop/shop-grid";
import { getCurrentUser } from "@/lib/auth";
import { shopCartCount, shopCatalog, shopPreviewBusinessName } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const [products, user] = await Promise.all([shopCatalog(), getCurrentUser()]);
  const [cartCount, businessName] = user ? await Promise.all([shopCartCount(user.id), shopPreviewBusinessName(user.id)]) : [0, null];
  // Commission is only meaningful for field agents (and admins checking payouts).
  const showCommission = user?.role === "AGENT" || user?.role === "ADMIN";
  return <ShopGrid products={products} showCommission={showCommission} cartCount={cartCount} businessName={businessName} />;
}

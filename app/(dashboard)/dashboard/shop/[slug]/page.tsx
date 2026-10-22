import { notFound } from "next/navigation";
import { ProductBuy } from "@/components/shop/product-buy";
import { getCurrentUser } from "@/lib/auth";
import { shopPreviewBusinessName, shopProduct } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

export default async function ShopProductPage({ params }: { params: { slug: string } }) {
  const [product, user] = await Promise.all([shopProduct(params.slug), getCurrentUser()]);
  if (!product) notFound();
  const businessName = user ? await shopPreviewBusinessName(user.id) : null;
  return <ProductBuy product={product} businessName={businessName} />;
}

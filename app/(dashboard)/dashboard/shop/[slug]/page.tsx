import { notFound } from "next/navigation";
import { ProductBuy } from "@/components/shop/product-buy";
import { shopProduct } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

export default async function ShopProductPage({ params }: { params: { slug: string } }) {
  const product = await shopProduct(params.slug);
  if (!product) notFound();
  return <ProductBuy product={product} />;
}

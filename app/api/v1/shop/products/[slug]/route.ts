import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { shopProduct } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest, { params }: { params: { slug: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const product = await shopProduct(params.slug);
  if (!product) return v1Error(404, "NOT_FOUND", "Product not found");
  return v1Data(product);
}

export const GET = observe(getHandler);

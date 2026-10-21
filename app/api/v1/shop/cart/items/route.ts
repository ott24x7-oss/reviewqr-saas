import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { shopCartItemSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { addShopCartItem } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, shopCartItemSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await addShopCartItem(auth.user.id, { sku: parsed.data.sku, qty: parsed.data.qty ?? 1, design: parsed.data.design }));
}

export const POST = observe(postHandler);

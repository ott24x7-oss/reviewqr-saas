import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { shopCartPutSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1From } from "@/lib/api/v1";
import { saveShopCart, shopCartView } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1Data(await shopCartView(auth.user.id, "app"));
}

async function putHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, shopCartPutSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await saveShopCart(auth.user.id, parsed.data, "app"));
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

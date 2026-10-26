import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { shopCatalog } from "@/lib/shop/cart-store";
import { shopCategory } from "@/lib/shop/physical";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const items = await shopCatalog("app");
  return v1Data({ items: items.map((item) => ({ ...item, category: shopCategory(item) })) });
}

export const GET = observe(getHandler);

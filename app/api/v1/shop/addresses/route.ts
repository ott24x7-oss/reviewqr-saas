import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { shopAddressSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1From } from "@/lib/api/v1";
import { createShopAddress } from "@/lib/shop/cart-store";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const items = await prisma.shippingAddress.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
  return v1Data({ items });
}

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, shopAddressSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await createShopAddress(auth.user.id, parsed.data));
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

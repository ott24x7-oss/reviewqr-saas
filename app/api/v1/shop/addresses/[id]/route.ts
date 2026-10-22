import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { deleteShopAddress } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await deleteShopAddress(auth.user.id, params.id));
}

export const DELETE = observe(deleteHandler);

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/utils";
import { requireV1User, v1From } from "@/lib/api/v1";
import { buyAgainShopOrder } from "@/lib/shop/owner-actions-service";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await buyAgainShopOrder(auth.user.id, params.id, getClientIp(req.headers)));
}

export const POST = observe(postHandler);

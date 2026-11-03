import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/utils";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { changeShopOrderAddress } from "@/lib/shop/owner-actions-service";

export const dynamic = "force-dynamic";

const schema = z.object({ addressId: z.string().min(1).max(40) });

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  return v1From(await changeShopOrderAddress(auth.user.id, params.id, parsed.data.addressId, getClientIp(req.headers)));
}

export const POST = observe(postHandler);

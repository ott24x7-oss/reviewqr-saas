import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getClientIp } from "@/lib/utils";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { cancelShopOrder } from "@/lib/shop/owner-actions-service";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().trim().min(1).max(500) });

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  return v1From(await cancelShopOrder(auth.user.id, params.id, parsed.data.reason, getClientIp(req.headers)));
}

export const POST = observe(postHandler);

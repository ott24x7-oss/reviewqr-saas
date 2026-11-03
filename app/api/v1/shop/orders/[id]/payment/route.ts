import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { getClientIp } from "@/lib/utils";
import { requireV1User, v1From } from "@/lib/api/v1";
import { resumeShopPayment } from "@/lib/shop/owner-actions-service";

export const dynamic = "force-dynamic";

async function postHandler(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(_req);
  if (!auth.ok) return auth.response;
  return v1From(await resumeShopPayment(auth.user.id, params.id, getClientIp(_req.headers)));
}

export const POST = observe(postHandler);

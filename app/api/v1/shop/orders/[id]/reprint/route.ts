import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { z } from "zod";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { requestShopReprint } from "@/lib/shop/reprint";

export const dynamic = "force-dynamic";

const schema = z.object({
  reason: z.enum(["damage", "misprint"]),
  note: z.string().max(500).optional()
});

async function postHandler(req: NextRequest, context?: { params: Record<string, string> }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, schema);
  if (!parsed.ok) return parsed.response;
  const result = await requestShopReprint({
    orderId: context?.params.id || "",
    userId: auth.user.id,
    reason: parsed.data.reason,
    note: parsed.data.note
  });
  return v1From(result);
}

export const POST = observe(postHandler);

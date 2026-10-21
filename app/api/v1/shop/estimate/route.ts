import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { shopEstimateSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { rateLimit } from "@/lib/rate-limit";
import { estimateShopDelivery } from "@/lib/shop/cart-store";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const limited = await rateLimit({ key: `shop-pin:${auth.user.id}`, limit: 30, windowSeconds: 600 });
  if (!limited.ok) return v1Error(429, "RATE_LIMIT", "Too many pincode checks. Try again shortly.");
  const parsed = await parseJson(req, shopEstimateSchema);
  if (!parsed.ok) return parsed.response;
  const estimate = await estimateShopDelivery(parsed.data.pincode, parsed.data.weightGrams);
  if (!estimate.ok) return v1Error(400, "VALIDATION", estimate.error);
  return v1Data(estimate);
}

export const POST = observe(postHandler);

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1From } from "@/lib/api/v1";
import { scopedFeatureBlock } from "@/lib/plans/feature-gate";
import { loadCustomers } from "@/lib/store/customer-list";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const businessId = req.nextUrl.searchParams.get("businessId") || undefined;
  const blocked = await scopedFeatureBlock(auth.user.id, "customers", businessId);
  if (blocked) return v1From(blocked);
  const items = await loadCustomers(auth.user.id, new Date(), businessId);
  return v1Data({ items });
}
export const GET = observe(getHandler);

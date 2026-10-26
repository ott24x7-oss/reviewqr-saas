import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error, v1From } from "@/lib/api/v1";
import { readBusinessAnalytics } from "@/lib/analytics/read";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) return v1Error(400, "VALIDATION", "businessId is required");
  const result = await readBusinessAnalytics(auth.user.id, businessId, {
    preset: req.nextUrl.searchParams.get("range"),
    from: req.nextUrl.searchParams.get("from"),
    to: req.nextUrl.searchParams.get("to")
  });
  if (!result.ok) {
    if ("code" in result && result.code === "PLAN_REQUIRED" && result.feature) return v1From(result);
    const code = result.status === 429 ? "RATE_LIMIT" : result.status === 400 ? "VALIDATION" : "NOT_FOUND";
    return v1Error(result.status, code, result.error);
  }
  return v1Data(result.data);
}

export const GET = observe(getHandler);

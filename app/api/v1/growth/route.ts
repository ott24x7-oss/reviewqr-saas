import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { computeGrowth, markGrowthTip } from "@/lib/growth/compute";
import { requireBusinessRole } from "@/lib/tenant";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) return v1Error(400, "VALIDATION", "businessId is required");
  const access = await requireBusinessRole(auth.user.id, businessId, "read");
  if (!access) return v1Error(404, "NOT_FOUND", "Business not found");
  const score = await computeGrowth(businessId);
  if (!score) return v1Error(404, "NOT_FOUND", "Business not found");
  return v1Data(score);
}

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { businessId?: string; tipKey?: string };
  const businessId = String(body.businessId || "");
  const access = await requireBusinessRole(auth.user.id, businessId, "manage");
  if (!access) return v1Error(404, "NOT_FOUND", "Business not found");
  const marked = await markGrowthTip(businessId, String(body.tipKey || ""));
  if (!marked.ok) return v1Error(400, "VALIDATION", marked.error);
  const score = await computeGrowth(businessId);
  return v1Data(score);
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

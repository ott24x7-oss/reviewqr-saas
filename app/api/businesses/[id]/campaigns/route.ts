import { NextRequest, NextResponse } from "next/server";
import { campaignCreateSchema } from "@reviewqr/shared";
import { requireUser } from "@/lib/auth";
import { createCampaign } from "@/lib/owner/mobile-extra";
import { denyFeatureResponse } from "@/lib/plans/feature-gate";
import { requireBusinessRole } from "@/lib/tenant";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await requireBusinessRole(user.id, params.id, "manage");
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const denied = await denyFeatureResponse(business.ownerId, "campaigns");
  if (denied) return denied;

  const parsed = campaignCreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const result = await createCampaign(user.id, params.id, parsed.data.name, parsed.data.template);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, feature: result.feature, error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json({ campaign: result.data });
}

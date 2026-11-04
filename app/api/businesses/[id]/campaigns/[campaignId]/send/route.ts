import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendCampaign } from "@/lib/owner/mobile-extra";

export async function POST(_req: NextRequest, { params }: { params: { id: string; campaignId: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await sendCampaign(user.id, params.id, params.campaignId);
  if (!result.ok) {
    return NextResponse.json(
      { code: result.code, feature: result.feature, error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json(result.data);
}

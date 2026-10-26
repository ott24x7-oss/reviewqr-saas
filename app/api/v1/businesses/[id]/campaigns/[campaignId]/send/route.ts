import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1From } from "@/lib/api/v1";
import { sendCampaign } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest, { params }: { params: { id: string; campaignId: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await sendCampaign(auth.user.id, params.id, params.campaignId));
}
export const POST = observe(postHandler);

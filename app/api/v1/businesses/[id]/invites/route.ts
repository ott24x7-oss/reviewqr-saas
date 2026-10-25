import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { staffInviteSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { inviteStaff } from "@/lib/owner/mobile-extra";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, staffInviteSchema);
  if (!parsed.ok) return parsed.response;
  return v1From(await inviteStaff(auth.user.id, params.id, parsed.data.email));
}
export const POST = observe(postHandler);

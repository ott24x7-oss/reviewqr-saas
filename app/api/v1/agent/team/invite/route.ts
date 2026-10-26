import { NextRequest } from "next/server";
import { agentInviteBodySchema } from "@reviewqr/shared";
import { observe } from "@/lib/api/observe";
import { parseJson, requireV1User, v1Error, v1From } from "@/lib/api/v1";
import { createTeamInvite } from "@/lib/plans/agent-team";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "AGENT") return v1Error(403, "FORBIDDEN", "Agent access only");
  const body = await parseJson(req, agentInviteBodySchema);
  if (!body.ok) return body.response;
  return v1From(await createTeamInvite(auth.user.id, body.data.phone));
}

export const POST = observe(postHandler);

import { NextRequest } from "next/server";
import { agentJoinBodySchema } from "@reviewqr/shared";
import { observe } from "@/lib/api/observe";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { joinTeam } from "@/lib/plans/agent-team";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const body = await parseJson(req, agentJoinBodySchema);
  if (!body.ok) return body.response;
  return v1From(await joinTeam(auth.user.id, body.data.code));
}

export const POST = observe(postHandler);

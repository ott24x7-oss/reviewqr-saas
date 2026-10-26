import { NextRequest } from "next/server";
import { agentProfilePutSchema } from "@reviewqr/shared";
import { observe } from "@/lib/api/observe";
import { parseJson, requireV1User, v1Error, v1From } from "@/lib/api/v1";
import { loadAgentProfile, saveAgentProfile } from "@/lib/plans/agent-team";

export const dynamic = "force-dynamic";

async function agent(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth;
  if (auth.user.role !== "AGENT") return { ok: false as const, response: v1Error(403, "FORBIDDEN", "Agent access only") };
  return auth;
}

async function getHandler(req: NextRequest) {
  const auth = await agent(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAgentProfile(auth.user.id));
}

async function putHandler(req: NextRequest) {
  const auth = await agent(req);
  if (!auth.ok) return auth.response;
  const body = await parseJson(req, agentProfilePutSchema);
  if (!body.ok) return body.response;
  return v1From(await saveAgentProfile(auth.user.id, body.data));
}

export const GET = observe(getHandler);
export const PUT = observe(putHandler);

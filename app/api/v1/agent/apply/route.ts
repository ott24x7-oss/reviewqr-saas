import { NextRequest } from "next/server";
import { agentApplicationSubmitSchema, type AgentApplicationStatus, type AgentApplicationSubmit } from "@reviewqr/shared";
import { observe } from "@/lib/api/observe";
import { parseJson, requireV1User, v1From } from "@/lib/api/v1";
import { applyForReseller, loadAgentApplication } from "@/lib/plans/agent-applications";
import type { ServiceResult } from "@/lib/api/result";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAgentApplication(auth.user.id) as ServiceResult<AgentApplicationStatus>);
}

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const body = await parseJson(req, agentApplicationSubmitSchema);
  if (!body.ok) return body.response;
  const application: AgentApplicationSubmit = {
    ...body.data,
    experience: body.data.experience ?? "",
    referralOrTeamCode: body.data.referralOrTeamCode ?? ""
  };
  return v1From(await applyForReseller(auth.user.id, application));
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { agentOnboardSchema } from "@reviewqr/shared";
import { parseJson, requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { startAgentOnboarding } from "@/lib/plans/agents";

export const dynamic = "force-dynamic";

async function postHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "AGENT") return v1Error(403, "FORBIDDEN", "Agent access only");
  const parsed = await parseJson(req, agentOnboardSchema);
  if (!parsed.ok) return parsed.response;
  const result = await startAgentOnboarding(auth.user.id, parsed.data.phone, parsed.data.businessName);
  if (!result.ok) return v1Error(400, "VALIDATION", result.error);
  return v1Data({ id: result.id, sent: true as const, channel: result.channel });
}
export const POST = observe(postHandler);

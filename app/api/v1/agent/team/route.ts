import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { requireV1User, v1Error, v1From } from "@/lib/api/v1";
import { loadAgentTeam } from "@/lib/plans/agent-team";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "AGENT") return v1Error(403, "FORBIDDEN", "Agent access only");
  return v1From(await loadAgentTeam(auth.user.id));
}

export const GET = observe(getHandler);

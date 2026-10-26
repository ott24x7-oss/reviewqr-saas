import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { requireV1User, v1Error, v1From, v1Page } from "@/lib/api/v1";
import { loadAgentCommissions } from "@/lib/plans/agent-team";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "AGENT") return v1Error(403, "FORBIDDEN", "Agent access only");
  const page = v1Page(req);
  if (!page.ok) return page.response;
  return v1From(await loadAgentCommissions(auth.user.id, page.page.cursorId, page.page.limit));
}

export const GET = observe(getHandler);

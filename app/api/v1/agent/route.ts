import { NextRequest } from "next/server";
import { observe } from "@/lib/api/observe";
import { requireV1User, v1Data, v1Error } from "@/lib/api/v1";
import { loadAgentHome } from "@/lib/plans/agent-home";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  if (auth.user.role !== "AGENT") return v1Error(403, "FORBIDDEN", "Agent access only");
  const home = await loadAgentHome(auth.user.id);
  if (!home) return v1Error(404, "NOT_FOUND", "No agent profile");
  return v1Data({
    code: home.code,
    link: home.link,
    shareText: home.shareText,
    totals: home.totals,
    salesPaise: home.salesPaise,
    businesses: home.businesses.map((business) => ({
      id: business.id,
      name: business.name,
      owner: business.owner,
      plan: business.plan,
      status: business.status,
      endsAt: business.endsAt,
      dueSoon: business.dueSoon
    })),
    payouts: home.payouts
  });
}

export const GET = observe(getHandler);

import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { adminTeamActionSchema } from "@reviewqr/shared";
import { parseJson, v1From } from "@/lib/api/v1";
import { commitAdminWrite } from "@/lib/admin/finish";
import { requireAdminActor } from "@/lib/admin/guard";
import { applyAdminTeamAction, loadAdminTeam } from "@/lib/admin/team-admin";

export const dynamic = "force-dynamic";

async function getHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  return v1From(await loadAdminTeam());
}

async function postHandler(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(req, adminTeamActionSchema);
  if (!parsed.ok) return parsed.response;
  const { id, ...body } = parsed.data;
  return commitAdminWrite(auth.actor, req, await applyAdminTeamAction(id, body, auth.actor.user.id), {
    action: "agent.update",
    entity: "AgentProfile",
    entityId: id,
    metadata: { op: body.action }
  });
}

export const GET = observe(getHandler);
export const POST = observe(postHandler);

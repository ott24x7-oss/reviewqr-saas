import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { moveAgentMember, setAgentShare, setAgentTeamStatus, loadTeamAdmin } from "@/lib/plans/admin-team";
import { reassignBusinessAgent } from "@/lib/plans/attribution";
import { maskPhone } from "./mask";

type TeamAction = {
  action: "update" | "reassign" | "approve" | "reject" | "pause" | "resume" | "share" | "move";
  name?: string;
  upiId?: string;
  city?: string;
  active?: boolean;
  businessId?: string;
  agentUserId?: string;
  sharePercent?: number;
  leaderUserId?: string;
};

function fromTeam(result: { ok: true } | { ok: false; error: string }) {
  if (result.ok) return null;
  const status = /not found/i.test(result.error) ? 404 : 400;
  return fail(status, result.error);
}

/** Same actions as the web agent screen. `id` is the agent profile id. */
export async function applyAdminTeamAction(id: string, body: TeamAction) {
  const before = await prisma.agentProfile.findUnique({
    where: { id },
    select: { status: true, active: true, sharePercent: true, leaderId: true, city: true }
  });
  if (body.action === "reassign") {
    const problem = fromTeam(await reassignBusinessAgent(body.businessId || "", body.agentUserId || id));
    if (problem) return problem;
  } else if (body.action === "approve" || body.action === "resume") {
    const problem = fromTeam(await setAgentTeamStatus(id, "ACTIVE"));
    if (problem) return problem;
  } else if (body.action === "reject" || body.action === "pause") {
    const problem = fromTeam(await setAgentTeamStatus(id, "PAUSED"));
    if (problem) return problem;
  } else if (body.action === "share") {
    const problem = fromTeam(await setAgentShare(id, body.sharePercent ?? -1));
    if (problem) return problem;
  } else if (body.action === "move") {
    const problem = fromTeam(await moveAgentMember(id, body.leaderUserId || ""));
    if (problem) return problem;
  } else {
    const profile = await prisma.agentProfile.findUnique({ where: { id }, select: { userId: true } });
    if (!profile) return fail(404, "Agent not found");
    await prisma.agentProfile.update({
      where: { id },
      data: {
        ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      }
    });
    if (body.name) {
      await prisma.user.update({ where: { id: profile.userId }, data: { name: body.name } });
    }
  }
  return ok({ before, after: { action: body.action } });
}

export async function loadAdminTeam() {
  const team = await loadTeamAdmin();
  return ok({
    settings: team.settings,
    agents: team.agents.map((agent) => ({ ...agent, phone: maskPhone(agent.phone) }))
  });
}

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

export async function loadAdminAgent(id: string) {
  const profile = await prisma.agentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      leader: { select: { id: true, code: true, user: { select: { name: true } } } }
    }
  });
  if (!profile) return fail(404, "Agent not found");
  return ok({
    id: profile.id,
    userId: profile.userId,
    name: profile.user.name || "Agent",
    email: profile.user.email,
    phone: maskPhone(profile.user.phone),
    code: profile.code,
    status: profile.status,
    city: profile.city,
    active: profile.active,
    depth: profile.depth,
    sharePercent: profile.sharePercent,
    upiId: profile.upiId,
    leader: profile.leader
      ? { id: profile.leader.id, code: profile.leader.code, name: profile.leader.user.name || "Leader" }
      : null
  });
}

export async function loadAdminTeam() {
  const team = await loadTeamAdmin();
  return ok({
    settings: team.settings,
    agents: team.agents.map((agent) => ({ ...agent, phone: maskPhone(agent.phone) }))
  });
}

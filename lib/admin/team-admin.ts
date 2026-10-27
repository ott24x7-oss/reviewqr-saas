import { fail, ok } from "@/lib/api/result";
import { prisma } from "@/lib/db";
import { moveAgentMember, setAgentShare, setAgentTeamStatus, loadTeamAdmin } from "@/lib/plans/admin-team";
import { indiaMonthRange } from "@/lib/plans/india";
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
export async function applyAdminTeamAction(id: string, body: TeamAction, actorUserId: string | null = null) {
  const before = await prisma.agentProfile.findUnique({
    where: { id },
    select: { status: true, active: true, sharePercent: true, leaderId: true, city: true, pausedBy: true }
  });
  if (body.action === "reassign") {
    const problem = fromTeam(await reassignBusinessAgent(body.businessId || "", body.agentUserId || id));
    if (problem) return problem;
  } else if (body.action === "approve" || body.action === "resume") {
    const problem = fromTeam(await setAgentTeamStatus(id, "ACTIVE"));
    if (problem) return problem;
  } else if (body.action === "reject") {
    const problem = fromTeam(await setAgentTeamStatus(id, "REJECTED", actorUserId));
    if (problem) return problem;
  } else if (body.action === "pause") {
    const problem = fromTeam(await setAgentTeamStatus(id, "PAUSED", actorUserId));
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
        // An admin on/off switch takes the pause away from the leader.
        ...(body.active !== undefined ? { active: body.active, pausedBy: null } : {})
      }
    });
    if (body.name) {
      await prisma.user.update({ where: { id: profile.userId }, data: { name: body.name } });
    }
  }
  const after = await prisma.agentProfile.findUnique({
    where: { id },
    select: { status: true, active: true, sharePercent: true, leaderId: true, city: true, pausedBy: true }
  });
  return ok({ before, after: { action: body.action, ...(after || {}) } });
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
  const range = indiaMonthRange(null);
  const userIds = team.agents.map((agent) => agent.userId);
  const scoped = userIds.length ? userIds : ["__none__"];
  const [sales, overrides, businesses] = await Promise.all([
    prisma.shopCommission.groupBy({
      by: ["agentId"],
      where: {
        agentId: { in: scoped },
        createdAt: { gte: range.start, lt: range.end },
        status: { not: "REVERSED" },
        kind: { not: "TEAM_OVERRIDE" }
      },
      _sum: { amountPaise: true }
    }),
    prisma.shopCommission.groupBy({
      by: ["agentId"],
      where: {
        agentId: { in: scoped },
        createdAt: { gte: range.start, lt: range.end },
        status: { not: "REVERSED" },
        kind: "TEAM_OVERRIDE"
      },
      _sum: { amountPaise: true }
    }),
    prisma.business.groupBy({
      by: ["agentId"],
      where: { agentId: { in: scoped } },
      _count: { _all: true }
    })
  ]);
  const salesBy = new Map(sales.map((row) => [row.agentId, row._sum.amountPaise || 0]));
  const overrideBy = new Map(overrides.map((row) => [row.agentId, row._sum.amountPaise || 0]));
  const businessBy = new Map(businesses.flatMap((row) => (row.agentId ? [[row.agentId, row._count._all] as const] : [])));
  const children = new Map<string, string[]>();
  for (const agent of team.agents) {
    if (!agent.leaderId) continue;
    const list = children.get(agent.leaderId) ?? [];
    list.push(agent.id);
    children.set(agent.leaderId, list);
  }
  const byId = new Map(team.agents.map((agent) => [agent.id, agent]));
  const subtreeUsers = (profileId: string) => {
    const ids: string[] = [];
    const walk = (id: string) => {
      const agent = byId.get(id);
      if (!agent) return;
      ids.push(agent.userId);
      for (const child of children.get(id) ?? []) walk(child);
    };
    walk(profileId);
    return ids;
  };
  const leaders = team.agents.filter((agent) => agent.depth === 1 || (children.get(agent.id)?.length ?? 0) > 0);
  const leaderboard = leaders
    .map((leader) => ({
      leaderId: leader.id,
      name: leader.name,
      monthSalesPaise: subtreeUsers(leader.id).reduce((sum, userId) => sum + (salesBy.get(userId) || 0), 0),
      overridePaise: overrideBy.get(leader.userId) || 0
    }))
    .sort((a, b) => b.monthSalesPaise - a.monthSalesPaise || b.overridePaise - a.overridePaise);
  return ok({
    settings: team.settings,
    agents: team.agents.map((agent) => ({
      ...agent,
      phone: maskPhone(agent.phone),
      businessCount: businessBy.get(agent.userId) || 0
    })),
    leaderboard: { label: range.label, rows: leaderboard },
    businessCounts: team.agents.map((agent) => ({
      agentId: agent.userId,
      name: agent.name,
      businesses: businessBy.get(agent.userId) || 0
    }))
  });
}

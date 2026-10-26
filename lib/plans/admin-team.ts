import { prisma } from "../db";
import { indiaMonthRange } from "./india";
import { getTeamProgramSettings } from "./team-settings";

export async function loadTeamAdmin() {
  const [profiles, settings] = await Promise.all([
    prisma.agentProfile.findMany({
      orderBy: { depth: "asc" },
      include: { user: { select: { name: true, phone: true } } }
    }),
    getTeamProgramSettings()
  ]);
  return {
    settings,
    agents: profiles.map((profile) => ({
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name || "Agent",
      phone: profile.user.phone || "",
      status: profile.status,
      active: profile.active,
      sharePercent: profile.sharePercent,
      depth: profile.depth,
      leaderId: profile.leaderId,
      code: profile.code
    }))
  };
}

export async function agentLeaderboard(month: string | null) {
  const range = indiaMonthRange(month);
  const grouped = await prisma.shopCommission.groupBy({
    by: ["agentId"],
    where: { createdAt: { gte: range.start, lt: range.end }, status: { not: "REVERSED" } },
    _sum: { amountPaise: true }
  });
  const ids = grouped.map((row) => row.agentId);
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = new Map(users.map((user) => [user.id, user.name || "Agent"]));
  return {
    label: range.label,
    rows: grouped
      .map((row) => ({
        agentId: row.agentId,
        name: names.get(row.agentId) || "Agent",
        amountPaise: row._sum.amountPaise || 0
      }))
      .sort((a, b) => b.amountPaise - a.amountPaise)
  };
}

async function subtree(rootId: string) {
  const all = await prisma.agentProfile.findMany({ select: { id: true, leaderId: true, depth: true } });
  const children = new Map<string, typeof all>();
  for (const row of all) {
    if (!row.leaderId) continue;
    const list = children.get(row.leaderId) || [];
    list.push(row);
    children.set(row.leaderId, list);
  }
  const out: typeof all = [];
  const walk = (id: string) => {
    const row = all.find((item) => item.id === id);
    if (!row) return;
    out.push(row);
    for (const child of children.get(id) || []) walk(child.id);
  };
  walk(rootId);
  return out;
}

export async function moveAgentMember(profileId: string, leaderUserId: string) {
  const settings = await getTeamProgramSettings();
  const member = await prisma.agentProfile.findUnique({ where: { id: profileId } });
  const leader = await prisma.agentProfile.findUnique({ where: { userId: leaderUserId } });
  if (!member || !leader) return { ok: false as const, error: "Agent not found" };
  if (member.id === leader.id) return { ok: false as const, error: "An agent cannot lead themselves" };
  let cursor: string | null = leader.id;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === member.id) return { ok: false as const, error: "That would put a leader under their own team" };
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const row: { leaderId: string | null } | null = await prisma.agentProfile.findUnique({
      where: { id: cursor },
      select: { leaderId: true }
    });
    cursor = row?.leaderId ?? null;
  }
  const rows = await subtree(member.id);
  const delta = leader.depth + 1 - member.depth;
  if (rows.some((row) => row.depth + delta > settings.maxTeamDepth || row.depth + delta < 1)) {
    return { ok: false as const, error: "That move is deeper than the team limit" };
  }
  await prisma.$transaction(
    rows.map((row) =>
      prisma.agentProfile.update({
        where: { id: row.id },
        data: { depth: row.depth + delta, ...(row.id === member.id ? { leaderId: leader.id } : {}) }
      })
    )
  );
  return { ok: true as const };
}

export async function setAgentShare(profileId: string, sharePercent: number) {
  const settings = await getTeamProgramSettings();
  if (!Number.isInteger(sharePercent) || sharePercent < settings.minSharePercent || sharePercent > settings.maxSharePercent) {
    return { ok: false as const, error: `Share must be between ${settings.minSharePercent} and ${settings.maxSharePercent}` };
  }
  const profile = await prisma.agentProfile.findUnique({ where: { id: profileId }, select: { id: true, leaderId: true } });
  if (!profile) return { ok: false as const, error: "Agent not found" };
  if (!profile.leaderId) return { ok: false as const, error: "A top-level agent has no share to set" };
  await prisma.agentProfile.update({ where: { id: profileId }, data: { sharePercent } });
  return { ok: true as const };
}

/**
 * Admin status change. An admin pause records the admin as `pausedBy`, so a leader
 * cannot undo it. A rejection is REJECTED, which a leader can never resume.
 */
export async function setAgentTeamStatus(
  profileId: string,
  status: "ACTIVE" | "PAUSED" | "REJECTED",
  actorUserId: string | null = null
) {
  const profile = await prisma.agentProfile.findUnique({ where: { id: profileId }, select: { id: true } });
  if (!profile) return { ok: false as const, error: "Agent not found" };
  await prisma.agentProfile.update({
    where: { id: profileId },
    data: { status, active: status === "ACTIVE", pausedBy: status === "PAUSED" ? actorUserId : null }
  });
  return { ok: true as const };
}

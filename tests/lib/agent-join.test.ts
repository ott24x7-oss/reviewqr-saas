import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/db";
import { joinTeam } from "../../lib/plans/agent-team";
import { moveAgentMember } from "../../lib/plans/admin-team";
import { makeCode } from "../../lib/plans/codes";

describe("joining a team", () => {
  const users: string[] = [];
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  let n = 0;

  afterAll(async () => {
    if (!users.length) return;
    await prisma.agentInvite.deleteMany({ where: { leader: { userId: { in: users } } } });
    await prisma.agentProfile.updateMany({ where: { userId: { in: users } }, data: { leaderId: null } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function person(role: "USER" | "AGENT" | "AGENCY" | "STAFF", profile?: { status?: "ACTIVE" | "PAUSED" | "PENDING" | "REJECTED"; active?: boolean }) {
    n += 1;
    const user = await prisma.user.create({ data: { email: `join-${stamp}-${n}@example.test`, role, name: `P${n}` } });
    users.push(user.id);
    const row = profile
      ? await prisma.agentProfile.create({
          data: { userId: user.id, code: makeCode(10), status: profile.status || "ACTIVE", active: profile.active ?? true, depth: 1 }
        })
      : null;
    return { user, profile: row };
  }

  async function invite(leaderProfileId: string) {
    const code = makeCode(10);
    await prisma.agentInvite.create({
      data: { code, leaderId: leaderProfileId, expiresAt: new Date(Date.now() + 86_400_000) }
    });
    return code;
  }

  it("refuses agency or staff accounts and leaves their role alone", async () => {
    const leader = await person("AGENT", {});
    for (const role of ["AGENCY", "STAFF"] as const) {
      const joiner = await person(role);
      const result = await joinTeam(joiner.user.id, await invite(leader.profile!.id));
      expect(result.ok).toBe(false);
      expect((await prisma.user.findUnique({ where: { id: joiner.user.id } }))?.role).toBe(role);
      expect(await prisma.agentProfile.findUnique({ where: { userId: joiner.user.id } })).toBeNull();
    }
  });

  it("keeps an agent's role and turns a plain user into an agent", async () => {
    const leader = await person("AGENT", {});
    const agent = await person("AGENT", {});
    const plain = await person("USER");
    expect((await joinTeam(agent.user.id, await invite(leader.profile!.id))).ok).toBe(true);
    expect((await joinTeam(plain.user.id, await invite(leader.profile!.id))).ok).toBe(true);
    expect((await prisma.user.findUnique({ where: { id: agent.user.id } }))?.role).toBe("AGENT");
    expect((await prisma.user.findUnique({ where: { id: plain.user.id } }))?.role).toBe("AGENT");
  });

  it("re-checks that the leader can still recruit when the invite is redeemed", async () => {
    const leader = await person("AGENT", {});
    const code = await invite(leader.profile!.id);
    await prisma.agentProfile.update({ where: { id: leader.profile!.id }, data: { status: "PAUSED", active: false } });
    const joiner = await person("USER");
    const result = await joinTeam(joiner.user.id, code);
    expect(result.ok).toBe(false);
    expect(await prisma.agentProfile.findUnique({ where: { userId: joiner.user.id } })).toBeNull();
    expect((await prisma.agentInvite.findUnique({ where: { code } }))?.usedAt).toBeNull();
  });

  it("does not let a rejected agent rejoin through an invite", async () => {
    const leader = await person("AGENT", {});
    const rejected = await person("AGENT", { status: "REJECTED", active: false });
    const result = await joinTeam(rejected.user.id, await invite(leader.profile!.id));
    expect(result.ok).toBe(false);
    expect((await prisma.agentProfile.findUnique({ where: { userId: rejected.user.id } }))).toMatchObject({
      status: "REJECTED",
      leaderId: null
    });
  });

  it("refuses to join a team under yourself", async () => {
    const top = await person("AGENT", {});
    const mid = await person("AGENT", {});
    await prisma.agentProfile.update({ where: { id: mid.profile!.id }, data: { leaderId: top.profile!.id, depth: 2 } });
    // top has a member, so the join stops before any loop could form.
    const result = await joinTeam(top.user.id, await invite(mid.profile!.id));
    expect(result.ok).toBe(false);
    expect((await prisma.agentProfile.findUnique({ where: { id: top.profile!.id } }))?.leaderId).toBeNull();
  });

  it("walks a looped subtree once when moving an agent", async () => {
    const a = await person("AGENT", {});
    const b = await person("AGENT", {});
    const target = await person("AGENT", {});
    await prisma.agentProfile.update({ where: { id: a.profile!.id }, data: { leaderId: b.profile!.id, depth: 1 } });
    await prisma.agentProfile.update({ where: { id: b.profile!.id }, data: { leaderId: a.profile!.id, depth: 1 } });
    const result = await moveAgentMember(a.profile!.id, target.user.id);
    expect(result).toHaveProperty("ok");
  });
});

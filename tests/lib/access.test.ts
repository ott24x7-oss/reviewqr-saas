import { afterAll, describe, expect, it } from "vitest";
import { canOnboard, requireBusinessAccess } from "../../lib/access";
import { prisma } from "../../lib/db";
import { canAccessAdmin } from "../../lib/roles";
import { accessRole, allows } from "../../lib/tenant";

describe("agent access", () => {
  it("lets an assigned agent manage and keeps admin off that role", () => {
    expect(accessRole("owner", "agent", null, "agent")).toBe("AGENT");
    expect(allows("AGENT", "manage")).toBe(true);
    expect(allows("AGENT", "read")).toBe(true);
    expect(allows("STAFF", "manage")).toBe(false);
    expect(accessRole("owner", "owner", null, "agent")).toBe("OWNER");
    expect(canAccessAdmin("ADMIN")).toBe(true);
    expect(canAccessAdmin("AGENT")).toBe(false);
    expect(canOnboard("AGENT")).toBe(true);
    expect(canOnboard("STAFF")).toBe(false);
  });

  const created: string[] = [];

  afterAll(async () => {
    if (!created.length) return;
    await prisma.business.deleteMany({ where: { ownerId: { in: created } } });
    await prisma.user.deleteMany({ where: { id: { in: created } } });
  });

  it("allows manage only on businesses the agent owns or is assigned to", async () => {
    const owner = await prisma.user.create({
      data: { email: `owner-${Date.now()}@example.test`, role: "USER" }
    });
    const agent = await prisma.user.create({
      data: { email: `agent-${Date.now()}@example.test`, role: "AGENT" }
    });
    created.push(owner.id, agent.id);
    const assigned = await prisma.business.create({
      data: { ownerId: owner.id, agentId: agent.id, name: "Assigned", slug: `assigned-${Date.now()}` }
    });
    const other = await prisma.business.create({
      data: { ownerId: owner.id, name: "Other", slug: `other-${Date.now()}` }
    });

    const access = await requireBusinessAccess(agent.id, assigned.id, "manage");
    expect(access?.accessRole).toBe("AGENT");
    expect(await requireBusinessAccess(agent.id, other.id, "read")).toBeNull();
  });
});

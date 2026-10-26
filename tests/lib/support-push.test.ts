import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const current = vi.hoisted(() => ({ user: null as null | { id: string } }));
const queueAdminPush = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/auth", () => ({ requireUser: vi.fn(async () => current.user) }));
vi.mock("../../lib/admin/push", () => ({ queueAdminPush }));

import { POST as supportPost } from "../../app/api/support/route";
import { prisma } from "../../lib/db";

describe("support ticket admin push", () => {
  let userId = "";

  afterAll(async () => {
    if (!userId) return;
    await prisma.supportMessage.deleteMany({ where: { authorId: userId } });
    await prisma.supportTicket.deleteMany({ where: { userId } });
    await prisma.rateLimit.deleteMany({ where: { key: `support:${userId}` } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("does not put the customer's subject in the admin push", async () => {
    const user = await prisma.user.create({ data: { email: `support-push-${Date.now()}@example.test`, role: "USER" } });
    userId = user.id;
    current.user = { id: user.id };
    const res = await supportPost(
      new NextRequest("http://localhost/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject: "My PAN ABCDE1234F is wrong", body: "Please fix my account details" })
      })
    );
    expect(res.status).toBe(200);
    expect(queueAdminPush).toHaveBeenCalledTimes(1);
    const push = (queueAdminPush.mock.calls[0] as unknown as [{ title: string; body: string }])[0];
    expect(push.body).toBe("New support ticket");
    expect(JSON.stringify(push)).not.toContain("ABCDE1234F");
  });
});

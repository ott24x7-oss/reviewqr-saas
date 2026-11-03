import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sendPushToUsers = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../lib/push", () => ({ sendPushToUsers }));

import { prisma } from "../../lib/db";
import { issueTokenPair } from "../../lib/auth/sessions";
import { makeCode } from "../../lib/plans/codes";
import { loadAgentApplication, reviewResellerApplication } from "../../lib/plans/agent-applications";
import { GET as applicationGet, POST as applicationPost } from "../../app/api/v1/agent/apply/route";
import { GET as adminInboxGet, POST as adminInboxPost } from "../../app/api/v1/admin/inbox/route";

const submission = {
  name: "Asha Kumar",
  phone: "9876543210",
  city: "Pune",
  state: "Maharashtra",
  howSell: "SHOP_VISITS",
  experience: "Local retail sales",
  languages: ["Hindi", "Marathi"],
  referralOrTeamCode: "",
  termsAccepted: true
};

describe("reseller applications", () => {
  const users: string[] = [];
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  let n = 0;
  const limitKeys: string[] = [];

  afterAll(async () => {
    if (limitKeys.length) await prisma.rateLimit.deleteMany({ where: { key: { in: limitKeys } } });
    if (!users.length) return;
    await prisma.notification.deleteMany({ where: { userId: { in: users } } });
    await prisma.agentApplication.deleteMany({ where: { userId: { in: users } } });
    await prisma.agentInvite.deleteMany({ where: { leader: { userId: { in: users } } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function person(role: "USER" | "AGENT" = "USER") {
    n += 1;
    const user = await prisma.user.create({
      data: { email: `apply-${stamp}-${n}@example.test`, name: `Applicant ${n}`, phone: `98765${String(n).padStart(5, "0")}`, role }
    });
    users.push(user.id);
    return user;
  }

  async function token(user: { id: string; role: string }) {
    return (await issueTokenPair(user, { deviceName: "application test" })).accessToken;
  }

  function call(url: string, access: string, init: { method?: string; body?: string } = {}) {
    return new NextRequest(url, { method: init.method, body: init.body, headers: { authorization: `Bearer ${access}` } });
  }

  it("creates a pending direct profile, keeps application answers private, and rejects duplicates", async () => {
    const applicant = await person();
    const stranger = await person();
    const access = await token(applicant);
    const strangerAccess = await token(stranger);
    const input = { ...submission, phone: applicant.phone! };
    const response = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify(input) }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("PENDING");
    const profile = await prisma.agentProfile.findUnique({ where: { userId: applicant.id } });
    expect(profile).toMatchObject({ status: "PENDING", active: false, leaderId: null, city: input.city, upiId: "", pan: null, bankAccount: null });

    const ownStatus = await applicationGet(call("http://localhost/api/v1/agent/apply", access));
    const ownBody = await ownStatus.json();
    expect(ownBody.data).toMatchObject({ status: "pending", rejectionReason: null, canReapply: false });
    expect(JSON.stringify(ownBody)).not.toContain(input.experience);
    expect(JSON.stringify(ownBody)).not.toContain(input.phone);
    const strangerStatus = await applicationGet(call("http://localhost/api/v1/agent/apply", strangerAccess));
    expect((await strangerStatus.json()).data.status).toBe("none");

    const duplicate = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify(input) }));
    expect(duplicate.status).toBe(409);
  });

  it("attaches a submitted application to a valid team invite using joinTeam rules", async () => {
    const leader = await person("AGENT");
    await prisma.agentProfile.create({ data: { userId: leader.id, code: makeCode(10), status: "ACTIVE", active: true, depth: 1 } });
    const inviteCode = makeCode(10);
    await prisma.agentInvite.create({ data: { code: inviteCode, leaderId: (await prisma.agentProfile.findUnique({ where: { userId: leader.id } }))!.id, expiresAt: new Date(Date.now() + 86_400_000) } });
    const applicant = await person();
    const access = await token(applicant);
    const response = await applicationPost(call("http://localhost/api/v1/agent/apply", access, {
      method: "POST",
      body: JSON.stringify({ ...submission, phone: applicant.phone, referralOrTeamCode: inviteCode })
    }));
    expect(response.status).toBe(200);
    const profile = await prisma.agentProfile.findUnique({ where: { userId: applicant.id } });
    expect(profile).toMatchObject({ leaderId: expect.any(String), depth: 2 });
    expect(["PENDING", "ACTIVE"]).toContain(profile?.status);
    expect(profile?.leaderId).toBe((await prisma.agentProfile.findUnique({ where: { userId: leader.id } }))?.id);
  });

  it("applies the rejection cooldown and permits reapplication after it expires", async () => {
    const applicant = await person();
    const access = await token(applicant);
    const submitted = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify({ ...submission, phone: applicant.phone }) }));
    expect(submitted.status).toBe(200);
    const app = await prisma.agentApplication.findUnique({ where: { userId: applicant.id } });
    await prisma.agentApplication.update({ where: { id: app!.id }, data: { status: "REJECTED", rejectionReason: "Please add more details", reviewedAt: new Date() } });
    await prisma.agentProfile.update({ where: { userId: applicant.id }, data: { status: "REJECTED", active: false } });
    const rejectedStatus = await loadAgentApplication(applicant.id);
    expect(rejectedStatus.ok && rejectedStatus.data.canReapply).toBe(false);
    const tooSoon = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify({ ...submission, phone: applicant.phone }) }));
    expect(tooSoon.status).toBe(409);
    await prisma.agentApplication.update({ where: { id: app!.id }, data: { reviewedAt: new Date(Date.now() - 31 * 86_400_000) } });
    const allowed = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify({ ...submission, phone: applicant.phone }) }));
    expect(allowed.status).toBe(200);
  });

  it("allows only admin tokens to review and activates plus notifies an approved applicant", async () => {
    const applicant = await person();
    const owner = await person();
    const ownerAccess = await token(owner);
    const noTokenList = await adminInboxGet(new NextRequest("http://localhost/api/v1/admin/inbox?segment=applications"));
    expect(noTokenList.status).toBe(401);
    const ownerList = await adminInboxGet(call("http://localhost/api/v1/admin/inbox?segment=applications", ownerAccess));
    expect(ownerList.status).toBe(403);
    const application = await prisma.agentApplication.create({
      data: {
        userId: applicant.id,
        applicantName: submission.name,
        phone: applicant.phone!,
        city: submission.city,
        state: submission.state,
        howSell: submission.howSell,
        experience: submission.experience,
        languages: submission.languages,
        termsVersion: "reseller-v1",
        termsAcceptedAt: new Date()
      }
    });
    await prisma.agentProfile.create({ data: { userId: applicant.id, code: makeCode(10), status: "PENDING", active: false } });
    const ownerDecision = await adminInboxPost(call("http://localhost/api/v1/admin/inbox", ownerAccess, { method: "POST", body: JSON.stringify({ segment: "applications", action: "approve", id: application.id }) }));
    expect(ownerDecision.status).toBe(403);

    sendPushToUsers.mockClear();
    const result = await reviewResellerApplication({ applicationId: application.id, action: "approve", actorId: owner.id });
    expect(result.ok).toBe(true);
    expect(await prisma.agentProfile.findUnique({ where: { userId: applicant.id } })).toMatchObject({ status: "ACTIVE", active: true, leaderId: null });
    expect((await prisma.user.findUnique({ where: { id: applicant.id } }))?.role).toBe("AGENT");
    expect(sendPushToUsers).toHaveBeenCalledWith([applicant.id], expect.objectContaining({ data: expect.objectContaining({ type: "agent_application_approved" }) }));
    expect(await prisma.notification.count({ where: { userId: applicant.id, type: "agent_application_approved", link: "/(app)/agent-home" } })).toBe(1);
  });

  it("rate limits application submissions", async () => {
    const applicant = await person();
    const access = await token(applicant);
    const key = `agent-apply:${applicant.id}`;
    limitKeys.push(key);
    for (let index = 0; index < 5; index += 1) {
      const response = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify({ ...submission, phone: applicant.phone }) }));
      expect(response.status).toBe(index === 0 ? 200 : 409);
    }
    const limited = await applicationPost(call("http://localhost/api/v1/agent/apply", access, { method: "POST", body: JSON.stringify({ ...submission, phone: applicant.phone }) }));
    expect(limited.status).toBe(429);
  });
});

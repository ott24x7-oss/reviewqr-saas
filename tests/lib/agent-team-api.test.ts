import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sendWhatsApp = vi.hoisted(() => vi.fn(async () => ({ ok: true as const, via: "cloud" as const })));
vi.mock("../../lib/whatsapp", () => ({ sendWhatsApp }));

import { GET as homeGet } from "../../app/api/v1/agent/home/route";
import { GET as businessesGet } from "../../app/api/v1/agent/businesses/route";
import { GET as commissionsGet } from "../../app/api/v1/agent/commissions/route";
import { GET as payoutsGet } from "../../app/api/v1/agent/payouts/route";
import { GET as profileGet, PUT as profilePut } from "../../app/api/v1/agent/profile/route";
import { GET as teamGet } from "../../app/api/v1/agent/team/route";
import { POST as invitePost } from "../../app/api/v1/agent/team/invite/route";
import { GET as memberGet, PATCH as memberPatch } from "../../app/api/v1/agent/team/[memberId]/route";
import { POST as joinPost } from "../../app/api/v1/agent/join/route";
import { openApiDocument } from "../../lib/api/openapi";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("agent team API", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: users } } });
    await prisma.commissionPayout.deleteMany({ where: { agentId: { in: users } } });
    await prisma.payment.deleteMany({ where: { userId: { in: users } } });
    await prisma.business.deleteMany({ where: { OR: [{ ownerId: { in: users } }, { agentId: { in: users } }] } });
    await prisma.agentInvite.deleteMany({ where: { leader: { userId: { in: users } } } });
    await prisma.agentProfile.deleteMany({ where: { userId: { in: users } } });
    await prisma.rateLimit.deleteMany({ where: { key: { in: users.map((id) => `agent-invite:${id}`) } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function token(user: { id: string; role: string }) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return pair.accessToken;
  }

  function call(url: string, access: string, init: { method?: string; body?: string } = {}) {
    return new NextRequest(url, {
      method: init.method,
      body: init.body,
      headers: { authorization: `Bearer ${access}` }
    });
  }

  it("covers every team endpoint and hides customer details", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    const leader = await prisma.user.create({
      data: { email: `api-lead-${stamp}@example.test`, name: "Lead Agent", role: "AGENT", phone: "9811111111" }
    });
    const other = await prisma.user.create({
      data: { email: `api-other-${stamp}@example.test`, name: "Other Agent", role: "AGENT" }
    });
    const joiner = await prisma.user.create({
      data: { email: `api-join-${stamp}@example.test`, name: "New Member", role: "USER", phone: "9822222222" }
    });
    const owner = await prisma.user.create({
      data: { email: `api-owner-${stamp}@example.test`, name: "SecretOwnerName", role: "USER", phone: "9000011111" }
    });
    users.push(leader.id, other.id, joiner.id, owner.id);
    await prisma.agentProfile.create({
      data: { userId: leader.id, code: `AL${stamp}`.slice(0, 12).toUpperCase(), status: "ACTIVE", depth: 1, active: true }
    });
    await prisma.agentProfile.create({
      data: { userId: other.id, code: `AO${stamp}`.slice(0, 12).toUpperCase(), status: "ACTIVE", depth: 1, active: true }
    });
    const leaderToken = await token(leader);
    const otherToken = await token(other);
    const joinerToken = await token(joiner);

    const stranger = await homeGet(call("http://127.0.0.1/api/v1/agent/home", joinerToken));
    expect(stranger.status).toBe(403);

    const home = await homeGet(call("http://127.0.0.1/api/v1/agent/home", leaderToken));
    expect(home.status).toBe(200);
    expect((await home.json()).data).toMatchObject({
      earnings: { todayPaise: 0, monthPaise: 0, pendingPaise: 0, paidPaise: 0 },
      businesses: 0,
      team: { members: 0, monthSalesPaise: 0 },
      status: "ACTIVE"
    });

    const businesses = await businessesGet(call("http://127.0.0.1/api/v1/agent/businesses", leaderToken));
    expect((await businesses.json()).data).toEqual({ items: [] });

    const saved = await profilePut(
      call("http://127.0.0.1/api/v1/agent/profile", leaderToken, {
        method: "PUT",
        body: JSON.stringify({
          name: "Lead Agent",
          city: "Pune",
          upiId: "lead@upi",
          pan: "ABCDE1234F",
          bankAccount: "123456789012",
          bankIfsc: "SBIN0001234",
          bankName: "Lead"
        })
      })
    );
    expect(saved.status).toBe(200);
    const profile = (await saved.json()).data;
    expect(profile.pan).toBe("••••••234F");
    expect(profile.bankLast4).toBe("9012");
    expect(JSON.stringify(profile)).not.toContain("ABCDE1234F");
    expect(JSON.stringify(profile)).not.toContain("123456789012");
    const readProfile = await profileGet(call("http://127.0.0.1/api/v1/agent/profile", leaderToken));
    expect((await readProfile.json()).data.city).toBe("Pune");

    const badPan = await profilePut(
      call("http://127.0.0.1/api/v1/agent/profile", leaderToken, {
        method: "PUT",
        body: JSON.stringify({ name: "Lead Agent", city: "Pune", upiId: "lead@upi", pan: "not-a-pan" })
      })
    );
    expect(badPan.status).toBe(400);

    sendWhatsApp.mockClear();
    const invited = await invitePost(
      call("http://127.0.0.1/api/v1/agent/team/invite", leaderToken, {
        method: "POST",
        body: JSON.stringify({ phone: "9876543210" })
      })
    );
    expect(invited.status).toBe(200);
    const invite = (await invited.json()).data;
    expect(invite.code).toMatch(/^[A-Z0-9]+$/);
    expect(invite.inviteLink).toContain(`/agent/join/${invite.code}`);
    expect(sendWhatsApp).toHaveBeenCalledTimes(1);

    const joined = await joinPost(
      call("http://127.0.0.1/api/v1/agent/join", joinerToken, {
        method: "POST",
        body: JSON.stringify({ code: invite.code })
      })
    );
    expect(joined.status).toBe(200);
    expect((await joined.json()).data.status).toBe("PENDING");
    expect(await prisma.shopCommission.count({ where: { agentId: { in: [leader.id, joiner.id] } } })).toBe(0);
    const again = await joinPost(
      call("http://127.0.0.1/api/v1/agent/join", joinerToken, {
        method: "POST",
        body: JSON.stringify({ code: invite.code })
      })
    );
    expect(again.status).toBe(400);

    const team = await teamGet(call("http://127.0.0.1/api/v1/agent/team", leaderToken));
    const teamBody = (await team.json()).data;
    expect(teamBody.canRecruit).toBe(true);
    expect(teamBody.minSharePercent).toBe(50);
    expect(teamBody.maxSharePercent).toBe(90);
    expect(teamBody.members).toEqual([
      expect.objectContaining({
        id: joiner.id,
        name: "New Member",
        phoneMasked: "••••2222",
        status: "PENDING",
        sharePercent: null
      })
    ]);
    expect(JSON.stringify(teamBody)).not.toContain("9822222222");

    const hidden = await memberGet(call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, otherToken), {
      params: { memberId: joiner.id }
    });
    expect(hidden.status).toBe(404);

    const tooLow = await memberPatch(
      call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, leaderToken, {
        method: "PATCH",
        body: JSON.stringify({ sharePercent: 10 })
      }),
      { params: { memberId: joiner.id } }
    );
    expect(tooLow.status).toBe(400);
    const resumePending = await memberPatch(
      call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, leaderToken, {
        method: "PATCH",
        body: JSON.stringify({ action: "resume" })
      }),
      { params: { memberId: joiner.id } }
    );
    expect(resumePending.status).toBe(400);

    await prisma.agentProfile.update({ where: { userId: joiner.id }, data: { status: "ACTIVE", active: true } });
    const shared = await memberPatch(
      call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, leaderToken, {
        method: "PATCH",
        body: JSON.stringify({ sharePercent: 70 })
      }),
      { params: { memberId: joiner.id } }
    );
    expect(shared.status).toBe(200);

    await prisma.business.create({
      data: { ownerId: owner.id, name: "Visible Cafe", slug: `visible-${stamp}`, agentId: joiner.id }
    });
    const payment = await prisma.payment.create({
      data: { userId: owner.id, amount: 49900, status: "COMPLETED", tier: "STARTER", periodMonths: 1 }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: joiner.id,
        kind: "SALE",
        sourceId: payment.id,
        paymentId: payment.id,
        amountPaise: 14000,
        percent: 10,
        sharePercent: 70,
        leaderId: leader.id,
        status: "PENDING"
      }
    });
    await prisma.shopCommission.create({
      data: {
        agentId: leader.id,
        kind: "TEAM_OVERRIDE",
        sourceId: payment.id,
        paymentId: payment.id,
        amountPaise: 6000,
        percent: 10,
        sharePercent: 100,
        status: "PENDING"
      }
    });

    const detail = await memberGet(call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, leaderToken), {
      params: { memberId: joiner.id }
    });
    const detailBody = await detail.json();
    expect(detail.status).toBe(200);
    expect(detailBody.data.sales[0]).toMatchObject({ kind: "SALE", businessName: "Visible Cafe", amountPaise: 14000 });
    const detailText = JSON.stringify(detailBody);
    expect(detailText).not.toContain("SecretOwnerName");
    expect(detailText).not.toContain("9000011111");

    const ledger = await commissionsGet(call("http://127.0.0.1/api/v1/agent/commissions", leaderToken));
    const ledgerBody = (await ledger.json()).data;
    expect(ledgerBody.items[0]).toMatchObject({
      kind: "TEAM_OVERRIDE",
      amountPaise: 6000,
      fromAgentName: "New Member",
      businessName: "Visible Cafe"
    });
    expect(JSON.stringify(ledgerBody)).not.toContain("SecretOwnerName");

    const joinerHome = await homeGet(call("http://127.0.0.1/api/v1/agent/home", await token(joiner)));
    expect((await joinerHome.json()).data.businesses).toBe(1);
    const joinerBusinesses = await businessesGet(call("http://127.0.0.1/api/v1/agent/businesses", await token(joiner)));
    const businessItems = (await joinerBusinesses.json()).data.items;
    expect(businessItems[0].name).toBe("Visible Cafe");
    expect(JSON.stringify(businessItems)).not.toContain("SecretOwnerName");

    await prisma.commissionPayout.create({
      data: {
        agentId: leader.id,
        amountPaise: 4700,
        grossPaise: 5000,
        tdsPaise: 300,
        netPaise: 4700,
        utr: `UTR${stamp}`.slice(0, 20),
        paidAt: new Date("2026-08-01T00:00:00.000Z")
      }
    });
    const payouts = await payoutsGet(call("http://127.0.0.1/api/v1/agent/payouts", leaderToken));
    expect((await payouts.json()).data.items[0]).toMatchObject({ grossPaise: 5000, tdsPaise: 300, netPaise: 4700 });

    const paused = await memberPatch(
      call(`http://127.0.0.1/api/v1/agent/team/${joiner.id}`, leaderToken, {
        method: "PATCH",
        body: JSON.stringify({ action: "pause" })
      }),
      { params: { memberId: joiner.id } }
    );
    expect(paused.status).toBe(200);
    expect((await prisma.agentProfile.findUnique({ where: { userId: joiner.id } }))?.status).toBe("PAUSED");

    for (let i = 0; i < 9; i += 1) {
      const extra = await invitePost(
        call("http://127.0.0.1/api/v1/agent/team/invite", leaderToken, { method: "POST", body: "{}" })
      );
      expect(extra.status).toBe(200);
    }
    const limited = await invitePost(
      call("http://127.0.0.1/api/v1/agent/team/invite", leaderToken, { method: "POST", body: "{}" })
    );
    expect(limited.status).toBe(429);

    const spec = openApiDocument();
    for (const path of [
      "/api/v1/agent/home",
      "/api/v1/agent/businesses",
      "/api/v1/agent/commissions",
      "/api/v1/agent/payouts",
      "/api/v1/agent/profile",
      "/api/v1/agent/team",
      "/api/v1/agent/team/invite",
      "/api/v1/agent/team/{memberId}",
      "/api/v1/agent/join"
    ]) {
      expect(spec.paths?.[path], path).toBeTruthy();
    }
  });
});

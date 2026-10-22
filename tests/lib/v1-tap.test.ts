import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as tapGet, PATCH as tapPatch } from "../../app/api/v1/businesses/[id]/tap/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 tap page", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.tapPage.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.qRCode.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, path: string, init: RequestInit = {}) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest(`http://127.0.0.1${path}`, {
      ...init,
      headers: { ...(init.headers || {}), authorization: `Bearer ${pair.accessToken}` }
    });
  }

  it("publishes buttons and a free theme, then reads them back", async () => {
    const user = await prisma.user.create({
      data: { email: `tap-${Date.now()}@example.test`, role: "USER", subscriptionTier: "FREE" }
    });
    users.push(user.id);
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: "Tap Cafe", slug: `tap-cafe-${Date.now()}` }
    });
    const qr = await prisma.qRCode.create({
      data: { businessId: business.id, label: "Counter", shortCode: `t${Date.now().toString(36)}` }
    });
    const saved = await tapPatch(
      await authed(user, `/api/v1/businesses/${business.id}/tap`, {
        method: "PATCH",
        body: JSON.stringify({
          action: "publish",
          bio: "Open late",
          themeId: "monochrome-luxe",
          links: [{ type: "menu", labelEn: "Menu", labelHi: "मेनू", enabled: true, url: "" }]
        })
      }),
      { params: { id: business.id } }
    );
    expect(saved.status).toBe(200);

    const res = await tapGet(await authed(user, `/api/v1/businesses/${business.id}/tap`), {
      params: { id: business.id }
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.code).toBe(qr.shortCode);
    expect(json.data.publicPath).toBe(`/t/${qr.shortCode}`);
    expect(json.data.bio).toBe("Open late");
    expect(json.data.themeId).toBe("monochrome-luxe");
    expect(json.data.links[0].type).toBe("menu");
    expect(json.data.themes.some((theme: { id: string }) => theme.id === "monochrome-luxe")).toBe(true);
  });

  it("hides another owner's tap page", async () => {
    const owner = await prisma.user.create({ data: { email: `tap-a-${Date.now()}@example.test`, role: "USER" } });
    const other = await prisma.user.create({ data: { email: `tap-b-${Date.now()}@example.test`, role: "USER" } });
    users.push(owner.id, other.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Private tap", slug: `private-tap-${Date.now()}` }
    });
    const res = await tapGet(await authed(other, `/api/v1/businesses/${business.id}/tap`), {
      params: { id: business.id }
    });
    expect(res.status).toBe(404);
  });
});

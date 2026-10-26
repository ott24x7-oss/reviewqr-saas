import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "../../app/api/v1/me/preferences/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";

describe("v1 app theme preferences", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function authed(user: { id: string; role: string }, init: { method?: string; body?: string } = {}) {
    const pair = await issueTokenPair(user, { deviceName: "test" });
    return new NextRequest("http://127.0.0.1/api/v1/me/preferences", {
      method: init.method,
      body: init.body,
      headers: { authorization: `Bearer ${pair.accessToken}` }
    });
  }

  it("defaults to emerald, saves a theme and reads it back", async () => {
    const user = await prisma.user.create({ data: { email: `prefs-${Date.now()}@example.test`, role: "USER" } });
    users.push(user.id);

    const first = await GET(await authed(user));
    expect(first.status).toBe(200);
    expect((await first.json()).data).toEqual({ appTheme: "emerald", cinematicAccent: "gold" });

    const saved = await PUT(
      await authed(user, { method: "PUT", body: JSON.stringify({ appTheme: "cinematic", cinematicAccent: "magenta" }) })
    );
    expect(saved.status).toBe(200);

    const again = await GET(await authed(user));
    expect((await again.json()).data).toEqual({ appTheme: "cinematic", cinematicAccent: "magenta" });
  });

  it("rejects an unknown theme, extra fields and a bad token", async () => {
    const user = await prisma.user.create({ data: { email: `prefs-bad-${Date.now()}@example.test`, role: "USER" } });
    users.push(user.id);

    const unknown = await PUT(
      await authed(user, { method: "PUT", body: JSON.stringify({ appTheme: "neon", cinematicAccent: "gold" }) })
    );
    expect(unknown.status).toBe(400);

    const extra = await PUT(
      await authed(user, {
        method: "PUT",
        body: JSON.stringify({ appTheme: "rose", cinematicAccent: "gold", role: "ADMIN" })
      })
    );
    expect(extra.status).toBe(400);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe("USER");

    const anon = await GET(
      new NextRequest("http://127.0.0.1/api/v1/me/preferences", { headers: { authorization: "Bearer not-a-token" } })
    );
    expect(anon.status).toBe(401);
  });
});

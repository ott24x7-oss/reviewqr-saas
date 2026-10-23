import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "../../app/api/v1/reports/preferences/route";
import { signAccessToken } from "../../lib/auth/access-token";
import { prisma } from "../../lib/db";
import { preferenceUpdate } from "../../lib/reports/preferences";

describe("report preference updates", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.reportPreference.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("changes only the fields that were sent", () => {
    const empty = preferenceUpdate({});
    expect(empty.ok && empty.empty).toBe(true);
    expect(preferenceUpdate({ emailOptIn: true })).toMatchObject({
      empty: false,
      patch: { emailOptIn: true, clearUnsubscribed: true }
    });
    expect(preferenceUpdate({ whatsappOptIn: false }).ok && preferenceUpdate({ whatsappOptIn: false })).toMatchObject({
      patch: { whatsappOptIn: false, clearUnsubscribed: false }
    });
    expect(preferenceUpdate({ emailOptIn: "yes" }).ok).toBe(false);
  });

  it("keeps an unsubscribe until the owner opts back in", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({ data: { email: `pref-${stamp}@example.test`, role: "USER" } });
    users.push(owner.id);
    const token = signAccessToken({ sub: owner.id, role: "USER" });

    function call(method: "GET" | "PUT", body?: unknown) {
      const handler = method === "GET" ? GET : PUT;
      return handler(
        new NextRequest("http://127.0.0.1/api/v1/reports/preferences", {
          method,
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body)
        })
      );
    }

    const missing = await call("GET");
    expect(missing.status).toBe(200);
    expect(await missing.json()).toMatchObject({ data: { emailOptIn: false, whatsappOptIn: false, unsubscribedAt: null } });
    expect(await prisma.reportPreference.findUnique({ where: { userId: owner.id } })).toBeNull();

    const empty = await call("PUT", {});
    expect(empty.status).toBe(200);
    expect(await prisma.reportPreference.findUnique({ where: { userId: owner.id } })).toBeNull();

    const email = await call("PUT", { emailOptIn: true });
    expect(email.status).toBe(200);
    expect((await email.json()).data.emailOptIn).toBe(true);
    let row = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(row?.emailOptIn).toBe(true);
    expect(row?.whatsappOptIn).toBe(false);

    const whatsapp = await call("PUT", { whatsappOptIn: true });
    expect((await whatsapp.json()).data.whatsappOptIn).toBe(true);
    row = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(row?.emailOptIn).toBe(true);
    expect(row?.whatsappOptIn).toBe(true);

    const unsubscribedAt = new Date("2026-10-01T00:00:00.000Z");
    await prisma.reportPreference.update({
      where: { userId: owner.id },
      data: { emailOptIn: false, whatsappOptIn: false, unsubscribedAt }
    });
    const stay = await call("PUT", { emailOptIn: false });
    expect((await stay.json()).data.unsubscribedAt).toBeTruthy();
    row = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(row?.unsubscribedAt?.toISOString()).toBe(unsubscribedAt.toISOString());
    expect(row?.whatsappOptIn).toBe(false);

    const back = await call("PUT", { whatsappOptIn: true });
    expect((await back.json()).data).toMatchObject({ emailOptIn: false, whatsappOptIn: true, unsubscribedAt: null });
    row = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(row?.emailOptIn).toBe(false);
    expect(row?.whatsappOptIn).toBe(true);
    expect(row?.unsubscribedAt).toBeNull();

    const bad = await call("PUT", { emailOptIn: "yes" });
    expect(bad.status).toBe(400);
    row = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(row?.whatsappOptIn).toBe(true);
  });
});

import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/reports/unsubscribe/route";
import { prisma } from "../../lib/db";
import { readReportToken, REPORT_TOKEN_SKEW_MS, REPORT_TOKEN_TTL_MS, reportToken } from "../../lib/reports/token";

const savedNext = process.env.NEXTAUTH_SECRET;
const savedAuth = process.env.AUTH_TOKEN_SECRET;

function restoreSecrets() {
  if (savedNext === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = savedNext;
  if (savedAuth === undefined) delete process.env.AUTH_TOKEN_SECRET;
  else process.env.AUTH_TOKEN_SECRET = savedAuth;
}

describe("report unsubscribe tokens", () => {
  const users: string[] = [];

  afterAll(async () => {
    restoreSecrets();
    if (!users.length) return;
    await prisma.reportPreference.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("signs with the configured secret, expires after 90 days, and fails closed", () => {
    process.env.NEXTAUTH_SECRET = "unsubscribe-next-secret";
    process.env.AUTH_TOKEN_SECRET = "unsubscribe-auth-secret";
    const now = new Date("2026-10-23T12:00:00.000Z");
    const token = reportToken("user_1", now);
    expect(token.startsWith("user_1.")).toBe(true);
    expect(token.split(".").length).toBe(3);
    expect(readReportToken(token, now)).toBe("user_1");
    expect(readReportToken(token, new Date(now.getTime() + REPORT_TOKEN_TTL_MS))).toBe("user_1");
    expect(readReportToken(token, new Date(now.getTime() + REPORT_TOKEN_TTL_MS + 1000))).toBeNull();
    expect(readReportToken(token, new Date(now.getTime() - REPORT_TOKEN_SKEW_MS))).toBe("user_1");
    expect(readReportToken(token, new Date(now.getTime() - REPORT_TOKEN_SKEW_MS - 1000))).toBeNull();
    expect(readReportToken("user_1.deadbeef", now)).toBeNull();
    const forged = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(readReportToken(forged, now)).toBeNull();

    delete process.env.NEXTAUTH_SECRET;
    expect(readReportToken(token, now)).toBeNull();
    const authOnly = reportToken("user_1", now);
    expect(readReportToken(authOnly, now)).toBe("user_1");
    delete process.env.AUTH_TOKEN_SECRET;
    expect(readReportToken(authOnly, now)).toBeNull();
    expect(() => reportToken("user_1", now)).toThrow(/not configured/);
    restoreSecrets();
  });

  it("shows a confirm form on GET and unsubscribes only on POST", async () => {
    process.env.NEXTAUTH_SECRET = "unsubscribe-next-secret";
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({ data: { email: `unsub-${stamp}@example.test` } });
    users.push(owner.id);
    await prisma.reportPreference.create({
      data: { userId: owner.id, emailOptIn: true, whatsappOptIn: true }
    });
    const token = reportToken(owner.id);

    const opened = await GET(new NextRequest(`http://127.0.0.1/api/reports/unsubscribe?token=${encodeURIComponent(token)}`));
    expect(opened.status).toBe(200);
    const html = await opened.text();
    expect(html).toContain('method="post"');
    expect(html).toContain('name="token"');
    expect(html).toContain("Unsubscribe");
    expect(html).not.toContain("ReviewQR");
    const still = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(still?.emailOptIn).toBe(true);
    expect(still?.unsubscribedAt).toBeNull();

    const bad = await POST(
      new NextRequest("http://127.0.0.1/api/reports/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "token=not-a-token"
      })
    );
    expect(bad.status).toBe(400);
    expect((await prisma.reportPreference.findUnique({ where: { userId: owner.id } }))?.unsubscribedAt).toBeNull();

    const posted = await POST(
      new NextRequest("http://127.0.0.1/api/reports/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }).toString()
      })
    );
    expect(posted.status).toBe(200);
    const done = await prisma.reportPreference.findUnique({ where: { userId: owner.id } });
    expect(done?.emailOptIn).toBe(false);
    expect(done?.whatsappOptIn).toBe(false);
    expect(done?.unsubscribedAt).toBeTruthy();
    restoreSecrets();
  });
});

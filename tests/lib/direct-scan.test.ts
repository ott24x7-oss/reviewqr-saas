import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as directScan } from "../../app/api/public/direct-scan/route";
import { middleware } from "../../middleware";
import { prisma } from "../../lib/db";
import { decideDirectScan } from "../../lib/tap/direct-scan";

describe("direct scan redirect", () => {
  const users: string[] = [];

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    if (!users.length) return;
    await prisma.qrScan.deleteMany({ where: { qrCode: { business: { ownerId: { in: users } } } } });
    await prisma.tapPage.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.qRCode.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  async function setup(input: {
    gating?: boolean;
    mode?: string;
    target?: string;
    deviceMode?: string;
    deviceTarget?: string;
    expired?: boolean;
    googleEnabled?: boolean;
  }) {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `direct-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "GROWTH",
        subscriptionStatus: "TRIALING",
        trialEndsAt: new Date(Date.now() + (input.expired ? -86_400_000 : 86_400_000))
      }
    });
    users.push(user.id);
    const business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: "Direct Cafe",
        slug: `direct-cafe-${stamp}`,
        googleReviewUrl: "https://reviews.example.test/write",
        reviewGating: input.gating === true,
        directMode: input.mode || "DIRECT",
        directTarget: input.target ?? "google"
      }
    });
    const code = `D${stamp}`.slice(0, 12).toUpperCase();
    const qr = await prisma.qRCode.create({
      data: {
        businessId: business.id,
        label: "Counter",
        shortCode: code,
        directMode: input.deviceMode || "INHERIT",
        directTarget: input.deviceTarget || ""
      }
    });
    await prisma.tapPage.create({
      data: {
        businessId: business.id,
        published: {
          links: [
            {
              key: "google",
              type: "google",
              labelEn: "Google review",
              labelHi: "Google रिव्यू",
              enabled: input.googleEnabled !== false,
              url: "https://reviews.example.test/write",
              sort: 10
            },
            {
              key: "menu",
              type: "menu",
              labelEn: "Menu",
              labelHi: "मेनू",
              enabled: true,
              url: "",
              sort: 20
            }
          ]
        }
      }
    });
    return { code, qrId: qr.id };
  }

  function headers(ip: string) {
    return new Headers({ "x-forwarded-for": ip, "user-agent": "vitest" });
  }

  it("records the direct scan before it returns the redirect, with no-store", async () => {
    const { code, qrId } = await setup({ gating: true });
    const ip = `direct-google-${code}`;
    const decision = await decideDirectScan({
      code,
      channel: "q",
      page: null,
      ownHosts: ["reviewqr.example"],
      headers: headers(ip)
    });
    const scan = await prisma.qrScan.findFirst({ where: { qrCodeId: qrId } });
    const qr = await prisma.qRCode.findUnique({ where: { id: qrId } });
    expect(scan?.direct).toBe(true);
    expect(scan?.target).toBe("google");
    expect(qr?.scans).toBe(1);
    expect(decision).toEqual({
      action: "redirect",
      location: "https://reviews.example.test/write",
      targetType: "google"
    });

    const res = await directScan(
      new NextRequest(`http://127.0.0.1/api/public/direct-scan?code=${code}&channel=q`, {
        headers: { "x-forwarded-for": `${ip}-route`, host: "reviewqr.example" }
      })
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({
      redirect: "https://reviews.example.test/write",
      target: "google"
    });
  });

  it("sends a device override to the menu and keeps ?page=1 and an expired plan on the page", async () => {
    const table = await setup({ deviceMode: "DIRECT", deviceTarget: "menu" });
    const menu = await decideDirectScan({
      code: table.code,
      channel: "q",
      page: null,
      ownHosts: [],
      headers: headers(`menu-${table.code}`)
    });
    expect(menu).toEqual({ action: "redirect", location: `/q/${table.code}/menu`, targetType: "menu" });

    const preview = await setup({});
    const page = await decideDirectScan({
      code: preview.code,
      channel: "q",
      page: "1",
      ownHosts: [],
      headers: headers(`page-${preview.code}`)
    });
    expect(page).toEqual({ action: "page" });
    expect(await prisma.qrScan.count({ where: { qrCodeId: preview.qrId } })).toBe(0);

    const expired = await setup({ expired: true });
    const blocked = await decideDirectScan({
      code: expired.code,
      channel: "t",
      page: null,
      ownHosts: [],
      headers: headers(`old-${expired.code}`)
    });
    expect(blocked).toEqual({ action: "page" });
    expect(await prisma.qrScan.count({ where: { qrCodeId: expired.qrId } })).toBe(0);
  });

  it("answers the scan URL with a 302 that is not stored, and refuses an unsafe location", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ redirect: "https://reviews.example.test/write", target: "google" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );
    const res = await middleware(new NextRequest("http://127.0.0.1:3459/q/TABLE01"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://reviews.example.test/write");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const preview = await middleware(new NextRequest("http://127.0.0.1:3459/q/TABLE01?page=1"));
    expect(preview.status).not.toBe(302);
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ redirect: "javascript:alert(1)" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const blocked = await middleware(new NextRequest("http://127.0.0.1:3459/t/TABLE01?src=nfc"));
    expect(blocked.status).not.toBe(302);
  });
});

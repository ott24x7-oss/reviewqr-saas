import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/public/tap/route";
import { prisma } from "../../lib/db";
import { keepLinkKey } from "../../lib/tap/links";

describe("tap link keys", () => {
  const users: string[] = [];

  afterAll(async () => {
    const leftover = await prisma.user.findMany({
      where: { email: { startsWith: "tap-key-", endsWith: "@example.test" } },
      select: { id: true }
    });
    for (const row of leftover) {
      if (!users.includes(row.id)) users.push(row.id);
    }
    if (!users.length) return;
    await prisma.tapEvent.deleteMany({ where: { qrCode: { business: { ownerId: { in: users } } } } });
    await prisma.qrScan.deleteMany({ where: { qrCode: { business: { ownerId: { in: users } } } } });
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "tap:203.0.113.77" } } });
    await prisma.tapPage.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.qRCode.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
  });

  it("keeps only keys the page can show", () => {
    expect(keepLinkKey(" call ", ["call", "menu"])).toBe("call");
    expect(keepLinkKey("hacked", ["call"])).toBeNull();
    expect(keepLinkKey("", ["call"])).toBeNull();
    expect(keepLinkKey(undefined, ["call"])).toBeNull();
  });

  it("stores a real button key and drops any other key without dropping the tap", async () => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({ data: { email: `tap-key-${stamp}@example.test` } });
    users.push(owner.id);
    const cafe = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Key Cafe",
        slug: `key-cafe-${stamp}`,
        phone: "9876543210",
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=abc",
        reviewGating: false
      }
    });
    const code = `LK${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: cafe.id, label: "Counter", shortCode: code } });

    async function click(linkKey: string) {
      const res = await POST(
        new NextRequest("http://127.0.0.1/api/public/tap", {
          method: "POST",
          headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.77", "user-agent": "Mozilla/5.0" },
          body: JSON.stringify({ code, type: "click", linkKey })
        })
      );
      expect(res.status).toBe(200);
    }

    await click("call");
    await click("not-a-button");
    await click("google");
    await prisma.business.update({ where: { id: cafe.id }, data: { reviewGating: true } });
    await click("google");
    await prisma.tapPage.create({
      data: {
        businessId: cafe.id,
        published: {
          links: [{ key: "special", type: "offer", url: "https://example.com/deal", labelEn: "Deal", enabled: true }]
        }
      }
    });
    await click("special");
    await click("call");

    const rows = await prisma.tapEvent.findMany({
      where: { businessId: cafe.id },
      orderBy: { id: "asc" },
      select: { linkKey: true }
    });
    expect(rows.map((row) => row.linkKey)).toEqual(["call", null, "google", null, "special", null]);
  });
});

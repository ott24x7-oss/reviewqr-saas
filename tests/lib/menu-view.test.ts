import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, menuViewLimitKey } from "../../app/api/public/menu-view/route";
import { prisma } from "../../lib/db";

describe("menu item views", () => {
  const users: string[] = [];

  afterAll(async () => {
    if (!users.length) return;
    await prisma.menuItemView.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.menuItem.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.qRCode.deleteMany({ where: { business: { ownerId: { in: users } } } });
    await prisma.business.deleteMany({ where: { ownerId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "menu-view:203.0.113." } } });
  });

  it("limits by IP and short code, ignores bots, and keeps another business's item", async () => {
    expect(menuViewLimitKey("203.0.113.9", "CODE1")).toBe("menu-view:203.0.113.9:CODE1");
    expect(menuViewLimitKey("203.0.113.9", "CODE1").includes("visitor")).toBe(false);

    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const owner = await prisma.user.create({ data: { email: `menu-view-${stamp}@example.test` } });
    users.push(owner.id);
    const cafe = await prisma.business.create({
      data: { ownerId: owner.id, name: "View Cafe", slug: `view-cafe-${stamp}` }
    });
    const other = await prisma.business.create({
      data: { ownerId: owner.id, name: "Other Cafe", slug: `view-other-${stamp}` }
    });
    const code = `MV${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: cafe.id, label: "Counter", shortCode: code } });
    const own = await prisma.menuItem.create({ data: { businessId: cafe.id, name: "Tea", pricePaise: 2000 } });
    const foreign = await prisma.menuItem.create({ data: { businessId: other.id, name: "Cake", pricePaise: 3000 } });
    const ip = `203.0.113.${stamp.length % 200}`;

    function call(body: unknown, userAgent = "Mozilla/5.0") {
      return POST(
        new NextRequest("http://127.0.0.1/api/public/menu-view", {
          method: "POST",
          headers: { "content-type": "application/json", "user-agent": userAgent, "x-forwarded-for": ip },
          body: JSON.stringify(body)
        })
      );
    }

    const bot = await call(
      { code, itemId: own.id, visitor: "visitor-12345678" },
      "Mozilla/5.0 (compatible; Googlebot/2.1)"
    );
    expect(bot.status).toBe(200);
    expect(await bot.json()).toEqual({ ok: true, ignored: true });
    expect(await prisma.menuItemView.count({ where: { itemId: own.id } })).toBe(0);

    const wrong = await call({ code, itemId: foreign.id, visitor: "visitor-12345678" });
    expect(wrong.status).toBe(404);
    expect(await prisma.menuItemView.count({ where: { businessId: cafe.id } })).toBe(0);

    const ok = await call({ code, itemId: own.id, visitor: "visitor-12345678" });
    expect(ok.status).toBe(200);
    const stored = await prisma.rateLimit.findUnique({ where: { key: menuViewLimitKey(ip, code) } });
    expect(stored?.count).toBe(2);
    expect(stored?.key.includes("visitor")).toBe(false);
    expect(await prisma.menuItemView.count({ where: { itemId: own.id, businessId: cafe.id } })).toBe(1);
  });
});

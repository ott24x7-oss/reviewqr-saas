import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      for (const row of text.split(/\r?\n/)) {
        if (!row.startsWith("DATABASE_URL=")) continue;
        let value = row.slice("DATABASE_URL=".length).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (value) return value;
      }
    } catch {
      /* The next file may hold the URL. */
    }
  }
  throw new Error("DATABASE_URL is missing");
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function published(theme: string, bio: string) {
  return {
    theme,
    bio,
    hours: Object.fromEntries(DAYS.map((day) => [day, { open: "00:00", close: "23:59" }]))
  };
}

async function finishMotion(page: Page) {
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
}

test("category heroes show only that business's actions", async ({ page }) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const tail = String(stamp).slice(-8);
  const shots = path.join(process.cwd(), "docs", "tap-landing");
  mkdirSync(shots, { recursive: true });
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const ownerEmail = `tap-land-${stamp}@example.com`;
  let userId = "";
  const codes: string[] = [];

  const pages = [
    {
      family: "cafe" as const,
      tone: "light" as const,
      theme: "sunset-mango",
      code: `cl${tail}`,
      name: "River Cafe",
      slug: `river-cafe-${tail}`,
      industry: "cafe",
      catalogMode: "MENU" as const,
      bio: "Filter coffee, all-day breakfast, and a quiet corner.",
      ratings: [5, 5, 5, 4, 5],
      flags: { dineIn: true, takeaway: true, delivery: true },
      items: [
        { name: "Filter coffee", pricePaise: 8000, kind: "PRODUCT" as const },
        { name: "Chef's table", pricePaise: 120000, kind: "SERVICE" as const }
      ]
    },
    {
      family: "cafe" as const,
      tone: "dark" as const,
      theme: "forest",
      code: `cd${tail}`,
      name: "River Cafe",
      slug: `river-cafe-night-${tail}`,
      industry: "cafe",
      catalogMode: "MENU" as const,
      bio: "Filter coffee, all-day breakfast, and a quiet corner.",
      ratings: [5, 5, 5, 4, 5],
      flags: { dineIn: true, takeaway: true, delivery: true },
      items: [
        { name: "Filter coffee", pricePaise: 8000, kind: "PRODUCT" as const },
        { name: "Chef's table", pricePaise: 120000, kind: "SERVICE" as const }
      ]
    },
    {
      family: "salon" as const,
      tone: "light" as const,
      theme: "sunset-mango",
      code: `sl${tail}`,
      name: "Studio Bloom",
      slug: `studio-bloom-${tail}`,
      industry: "salon",
      catalogMode: "SERVICES" as const,
      bio: "Cuts, colour, and unhurried appointments.",
      ratings: [5],
      flags: { dineIn: false, takeaway: false, delivery: false },
      items: [{ name: "Haircut", pricePaise: 50000, kind: "SERVICE" as const, durationMinutes: 45 }]
    },
    {
      family: "salon" as const,
      tone: "dark" as const,
      theme: "forest",
      code: `sd${tail}`,
      name: "Studio Bloom",
      slug: `studio-bloom-night-${tail}`,
      industry: "salon",
      catalogMode: "SERVICES" as const,
      bio: "Cuts, colour, and unhurried appointments.",
      ratings: [5],
      flags: { dineIn: false, takeaway: false, delivery: false },
      items: [{ name: "Haircut", pricePaise: 50000, kind: "SERVICE" as const, durationMinutes: 45 }]
    },
    {
      family: "shop" as const,
      tone: "light" as const,
      theme: "sunset-mango",
      code: `hl${tail}`,
      name: "North Market",
      slug: `north-market-${tail}`,
      industry: "shop",
      catalogMode: "MENU" as const,
      bio: "Everyday clothes, packed the same day.",
      ratings: [5, 5, 4],
      flags: { dineIn: false, takeaway: true, delivery: true },
      items: [
        { name: "Cotton shirt", pricePaise: 79900, kind: "PRODUCT" as const },
        { name: "Linen trouser", pricePaise: 129900, kind: "PRODUCT" as const }
      ]
    },
    {
      family: "shop" as const,
      tone: "dark" as const,
      theme: "forest",
      code: `hd${tail}`,
      name: "North Market",
      slug: `north-market-night-${tail}`,
      industry: "shop",
      catalogMode: "MENU" as const,
      bio: "Everyday clothes, packed the same day.",
      ratings: [5, 5, 4],
      flags: { dineIn: false, takeaway: true, delivery: true },
      items: [
        { name: "Cotton shirt", pricePaise: 79900, kind: "PRODUCT" as const },
        { name: "Linen trouser", pricePaise: 129900, kind: "PRODUCT" as const }
      ]
    }
  ];

  try {
    const owner = await prisma.user.create({
      data: { email: ownerEmail, role: "USER", subscriptionTier: "FREE", subscriptionStatus: "TRIALING" }
    });
    userId = owner.id;

    for (const row of pages) {
      codes.push(row.code);
      const business = await prisma.business.create({
        data: {
          ownerId: owner.id,
          name: row.name,
          slug: row.slug,
          industry: row.industry,
          description: row.bio,
          catalogMode: row.catalogMode,
          whatsappNumber: "9876543210",
          phone: "9876543210",
          googleReviewUrl: "https://search.google.com/local/writereview?placeid=taplanding",
          city: "Pune"
        }
      });
      await prisma.tapPage.create({
        data: { businessId: business.id, published: published(row.theme, row.bio) }
      });
      await prisma.storeSettings.create({
        data: { businessId: business.id, ...row.flags }
      });
      await prisma.menuItem.createMany({
        data: row.items.map((item) => ({ businessId: business.id, ...item }))
      });
      await prisma.review.createMany({
        data: row.ratings.map((rating) => ({
          businessId: business.id,
          rating,
          sentiment: rating >= 4 ? "POSITIVE" : "NEUTRAL"
        }))
      });
      await prisma.qRCode.create({
        data: { businessId: business.id, label: "Counter", shortCode: row.code, status: "ACTIVE", isActive: true }
      });
    }

    for (const row of pages) {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/q/${row.code}`);
      await expect(page.getByRole("heading", { name: row.name, level: 1 })).toBeVisible();
      await expect(page.getByTestId("landing-hero")).toHaveAttribute("data-family", row.family);
      await finishMotion(page);
      const text = await page.locator("body").innerText();
      if (row.family === "cafe") {
        expect(text).not.toMatch(/Book on WhatsApp|Book appointment/i);
        expect(text).toContain("View Menu");
        expect(text).toContain("Order on WhatsApp");
        expect(text).toContain("Open until");
        expect(text).toContain("Dine-in");
        expect(text).toContain("Filter coffee");
      }
      if (row.family === "salon") {
        expect(text).not.toMatch(/dine-?in|Dine-in|Takeaway|View Menu|Order on WhatsApp/i);
        expect(text).toContain("Book on WhatsApp");
        expect(text).toContain("1 service");
        expect(text).toContain("Haircut");
      }
      if (row.family === "shop") {
        expect(text).not.toMatch(/dine-?in|Dine-in|Takeaway/i);
        expect(text).toContain("Order on WhatsApp");
        expect(text).toContain("Pickup");
        expect(text).toContain("Delivery");
        expect(text).toContain("2 products");
      }
      expect(text).toContain("Powered by");
      expect(text).toContain("QR24x7");
      await page.screenshot({ path: path.join(shots, `${row.family}-${row.tone}-375.png`), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 900 });
      await finishMotion(page);
      await page.screenshot({ path: path.join(shots, `${row.family}-${row.tone}-1440.png`), fullPage: true });
    }

    const cafe = pages[0];
    const salon = pages[2];
    const shop = pages[4];
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/q/${cafe.code}`);
    await page.getByRole("button", { name: "हिं" }).click();
    await expect(page.getByRole("link", { name: "मेनू देखें" })).toBeVisible();
    await page.getByRole("button", { name: "EN" }).click();
    await page.getByRole("button", { name: "Give Feedback" }).click();
    await expect(page.getByRole("button", { name: "Send feedback" })).toBeVisible();
    await page.getByRole("link", { name: "View Menu" }).click();
    await expect(page).toHaveURL(new RegExp(`/q/${cafe.code}/menu`));

    await page.goto(`/q/${salon.code}`);
    await page.getByRole("link", { name: "Book on WhatsApp" }).click();
    await expect(page.getByTestId("services-board")).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();

    await page.goto(`/q/${shop.code}`);
    await page.getByRole("link", { name: "Order on WhatsApp" }).click();
    await expect(page).toHaveURL(new RegExp(`/q/${shop.code}/menu`));
    await expect(page.getByText("Cotton shirt").first()).toBeVisible();
  } finally {
    if (codes.length) await prisma.qRCode.deleteMany({ where: { shortCode: { in: codes } } }).catch(() => {});
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.$disconnect();
  }
});

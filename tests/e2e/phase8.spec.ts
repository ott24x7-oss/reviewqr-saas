import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { addIstDays, istDayKey, istDayStart } from "../../lib/analytics/ist";

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

test("owner reads analytics, growth tips, help, and dismisses an announcement", async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync("docs/phase-8", { recursive: true });
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
  const email = `phase8-${stamp}@example.com`;
  const articleTitle = `Print tent ${stamp}`;
  const billingTitle = `Pay the invoice ${stamp}`;
  const noteTitle = `Phase 8 note ${stamp}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const articleIds: string[] = [];
  let announcementId = "";

  try {
    await page.goto("/register");
    await page.getByRole("button", { name: "Use email instead" }).click();
    await page.getByLabel("Your name").fill("Phase Owner");
    await page.getByLabel("Business name").fill(`Phase Cafe ${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("SmokeTest1");
    const growthDone = page.waitForResponse((res) => res.url().includes("/api/v1/growth"), { timeout: 30_000 });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");
    await growthDone;

    const user = await prisma.user.findUnique({ where: { email }, include: { businesses: { select: { id: true } } } });
    const businessId = user?.businesses[0]?.id;
    expect(businessId).toBeTruthy();
    const today = istDayKey(new Date());
    const hours = Array.from({ length: 24 }, (_, hour) => (hour === 12 ? 3 : 0));
    await prisma.business.update({
      where: { id: businessId },
      data: { createdAt: new Date(Date.now() - 20 * 86400000) }
    });
    await prisma.analyticsDaily.deleteMany({ where: { businessId } });
    await prisma.analyticsDaily.createMany({
      data: Array.from({ length: 60 }, (_, index) => {
        const scans = index <= 6 ? 2 : index <= 29 ? 10 : 0;
        return {
          businessId: businessId as string,
          day: new Date(`${addIstDays(today, -index)}T00:00:00.000Z`),
          scans,
          tapsNfc: index <= 6 ? 1 : 0,
          tapsQr: scans,
          pageViews: scans,
          buttonClicks: {},
          menuViews: 0,
          topItems: [],
          orderCount: 0,
          orderPaise: 0,
          feedbackCount: 0,
          ratingSum: 0,
          ratingCount: 0,
          ratings: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
          hours,
          byQr: [],
          byStaff: [],
          byDevice: { mobile: scans, tablet: 0, desktop: 0, other: 0 },
          byTable: []
        };
      })
    });
    const yesterday = addIstDays(today, -1);
    const qr =
      (await prisma.qRCode.findFirst({ where: { businessId: businessId as string } })) ||
      (await prisma.qRCode.create({
        data: {
          businessId: businessId as string,
          label: "Counter",
          shortCode: `P8${stamp}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase()
        }
      }));
    const seenAt = new Date(istDayStart(yesterday).getTime() + 60 * 60 * 1000);
    await prisma.qrScan.createMany({
      data: [
        { qrCodeId: qr.id, ipHash: `e2e-${stamp}-a`, createdAt: seenAt },
        { qrCodeId: qr.id, ipHash: `e2e-${stamp}-b`, createdAt: new Date(seenAt.getTime() + 60_000) }
      ]
    });
    const articles = await prisma.helpArticle.createManyAndReturn({
      data: [
        {
          slug: `print-tent-${stamp}`,
          category: "Print",
          language: "en",
          title: articleTitle,
          body: `How to print a table tent ${stamp}.`,
          contextKey: "",
          sortOrder: 1,
          published: true
        },
        {
          slug: `pay-invoice-${stamp}`,
          category: "Billing",
          language: "en",
          title: billingTitle,
          body: "Open the pending invoice and pay it.",
          contextKey: "billing",
          sortOrder: 2,
          published: true
        }
      ]
    });
    articleIds.push(...articles.map((row) => row.id));
    const note = await prisma.announcement.create({
      data: {
        title: noteTitle,
        body: "Analytics is ready.",
        audience: "all",
        startsAt: new Date(Date.now() - 86400000),
        endsAt: new Date(Date.now() + 7 * 86400000),
        published: true
      }
    });
    announcementId = note.id;

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dashboard");
    const banner = page.getByTestId("announcement-banner").filter({ hasText: noteTitle });
    await expect(banner).toBeVisible();
    await page.screenshot({ path: "docs/phase-8/announcement-360.png", fullPage: true });

    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("link", { name: "Analytics", exact: true }).click();
    await expect(page.getByTestId("analytics-board")).toBeVisible();
    await expect(page.getByTestId("scans-value")).toHaveText("14");
    await expect(page.getByTestId("heat-cell")).toHaveCount(168);
    const heat = await page.getByTestId("analytics-heatmap").boundingBox();
    expect(heat && heat.width > 0 && heat.width <= 360).toBeTruthy();
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(fits).toBe(true);
    await expect(page.getByTestId("growth-card").locator("li")).toHaveCount(3);
    await page.screenshot({ path: "docs/phase-8/analytics-360.png", fullPage: true });
    await page.getByTestId("growth-card").screenshot({ path: "docs/phase-8/growth-360.png" });

    await page.getByRole("button", { name: "30d", exact: true }).click();
    await expect(page.getByTestId("scans-value")).toHaveText("244");
    await expect(page.getByTestId("analytics-range")).toContainText(addIstDays(today, -29));

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "docs/phase-8/analytics-1280.png", fullPage: true });
    await page.getByTestId("growth-card").screenshot({ path: "docs/phase-8/growth-1280.png" });
    await page.goto("/dashboard");
    await expect(banner).toBeVisible();
    await page.screenshot({ path: "docs/phase-8/announcement-1280.png", fullPage: true });
    await banner.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(noteTitle)).toHaveCount(0);

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dashboard/help");
    await page.getByLabel("Search help articles").fill(articleTitle);
    await expect(page.getByTestId("help-article").filter({ hasText: articleTitle })).toBeVisible();
    await expect(page.getByTestId("help-article").filter({ hasText: billingTitle })).toHaveCount(0);
    await page.screenshot({ path: "docs/phase-8/help-360.png", fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "docs/phase-8/help-1280.png", fullPage: true });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/dashboard/billing");
    await page.getByRole("button", { name: "Help for Billing" }).click();
    const sheet = page.getByTestId("help-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(billingTitle);
    await sheet.screenshot({ path: "docs/phase-8/help-sheet-360.png" });
  } finally {
    if (announcementId) await prisma.announcement.delete({ where: { id: announcementId } }).catch(() => undefined);
    if (articleIds.length) await prisma.helpArticle.deleteMany({ where: { id: { in: articleIds } } });
    await prisma.$disconnect();
  }
});

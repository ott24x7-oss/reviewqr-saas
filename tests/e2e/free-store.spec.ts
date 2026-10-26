import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

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

test("a free owner still takes a store order after the plan migration", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `free-store-${stamp}@example.com`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await page.goto("/register");
    await page.getByRole("button", { name: "Use email instead" }).click();
    await page.getByLabel("Your name").fill("Free Owner");
    await page.getByLabel("Business name").fill(`Free Cafe ${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("FreeStore1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    expect(user?.id).toBeTruthy();
    const business = await prisma.business.findFirst({ where: { ownerId: user!.id }, select: { id: true } });
    expect(business?.id).toBeTruthy();
    await prisma.subscription.updateMany({
      where: { userId: user!.id, planId: "plan_legacy_free" },
      data: { modules: ["REVIEWS"] }
    });

    await page.goto(`/dashboard/account/settings?section=store&businessId=${business!.id}`);
    await expect(page.getByLabel("Store layout")).toBeVisible();
    await page.getByLabel("Store layout").selectOption("FOOD");
    await page.getByRole("button", { name: "Save store settings" }).click();
    await expect(page.getByText("Store settings saved").first()).toBeVisible();
    await page.goto(`/dashboard/sell/menu?businessId=${business!.id}`);
    await page.getByLabel("Item name").fill("Free Tea");
    await page.getByLabel("Price in rupees").fill("20");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Free Tea").first()).toBeVisible();
    await page.goto(`/dashboard/page/qr?tab=create&businessId=${business!.id}`);
    await page.getByLabel("Label").fill("Counter");
    await page.getByRole("button", { name: "Create QR code" }).click();
    await expect(page.getByText("Short URL")).toBeVisible();
    const shortUrl = await page.locator("code").first().innerText();
    const code = shortUrl.match(/\/q\/([^/?#\s]+)/)?.[1];
    expect(code, shortUrl).toBeTruthy();

    await page.goto(`/q/${code}/menu`);
    await page.getByRole("button", { name: "Add Free Tea" }).click();
    await page.getByRole("button", { name: "View cart" }).click();
    await page.getByRole("button", { name: "Order on WhatsApp" }).click();
    await page.waitForURL(/\/o\//);
    const number = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
    expect(number).toBeTruthy();
    const order = await prisma.menuOrder.findFirst({
      where: { business: { ownerId: user!.id }, number }
    });
    expect(order?.totalPaise).toBeGreaterThan(0);
  } finally {
    await prisma.$disconnect();
  }
});

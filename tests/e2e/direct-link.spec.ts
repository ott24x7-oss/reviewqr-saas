import { readFileSync } from "node:fs";
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

async function createCode(page: Page, businessId: string, label: string) {
  await page.goto(`/dashboard/page/qr?businessId=${businessId}&tab=create`);
  await page.getByLabel(/^Label/).fill(label);
  await page.getByRole("button", { name: "Create QR code" }).click();
  await expect(page.getByText("Short URL")).toBeVisible();
  const shortUrl = await page.locator("code").first().innerText();
  const code = shortUrl.match(/\/q\/([^/?#\s]+)/)?.[1] || "";
  expect(code).toBeTruthy();
  return code;
}

test("a direct scan opens the chosen link, and one device can open the menu instead", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `direct-${Date.now()}@example.com`;
  const businessName = "Direct Cafe";
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await page.goto("/register");
    await page.getByRole("button", { name: "Use email instead" }).click();
    await page.getByLabel("Your name").fill("Direct Owner");
    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("DirectTest1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");

    await page.goto("/dashboard/account/settings?section=businesses");
    const manage = page.getByRole("link", { name: "Manage", exact: true });
    const businessId = (await manage.getAttribute("href"))?.match(/\/dashboard\/businesses\/([^/?#]+)/)?.[1] || "";
    expect(businessId).toBeTruthy();

    const counter = await createCode(page, businessId, "Counter");
    const table = await createCode(page, businessId, "Table");

    await page.goto(`/dashboard/page?businessId=${businessId}&tab=buttons`);
    await expect(page.getByRole("heading", { name: "Customer page" })).toBeVisible();

    await page.getByRole("button", { name: "Add button" }).click();
    const google = page.locator("article").last();
    await google.getByRole("checkbox", { name: "Show" }).check();
    await google.getByRole("combobox", { name: "Button type" }).selectOption("google");
    await google.getByRole("textbox", { name: "English label" }).fill("Google review");
    // The browser follows the 302 itself. A route cannot replace that second request.
    await google.getByRole("textbox", { name: "Link" }).fill("https://example.com/?reviewqr=direct");

    await page.getByRole("button", { name: "Add button" }).click();
    const menu = page.locator("article").last();
    await menu.getByRole("checkbox", { name: "Show" }).check();
    await menu.getByRole("combobox", { name: "Button type" }).selectOption("menu");
    await menu.getByRole("textbox", { name: "English label" }).fill("Menu");

    await page.getByRole("checkbox", { name: "Open one link directly (skip page)" }).check();
    await page.getByRole("combobox", { name: "Direct link" }).selectOption({ label: "Google review" });
    await expect(page.getByText("Scanning your QR will open: Google review")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Page published").first()).toBeVisible();

    const before = await prisma.qRCode.findUnique({ where: { shortCode: counter }, select: { scans: true } });
    await page.goto(`/q/${counter}`);
    await expect(page).toHaveURL("https://example.com/?reviewqr=direct");
    await expect(page.getByText("This domain is for use in documentation examples")).toBeVisible();
    const after = await prisma.qRCode.findUnique({ where: { shortCode: counter }, select: { scans: true } });
    expect(after?.scans).toBe((before?.scans || 0) + 1);

    await page.goto(`/dashboard/page/qr?businessId=${businessId}`);
    await page.getByRole("combobox", { name: `Opens for ${table}` }).selectOption({ label: "Menu" });
    await expect(page.getByText("Opens: Menu")).toBeVisible();

    await page.goto(`/q/${table}`);
    await expect(page).toHaveURL(new RegExp(`/q/${table}/menu/?$`));

    await page.goto(`/q/${counter}?page=1`);
    await expect(page.getByRole("heading", { name: businessName })).toBeVisible();
    await expect(page).not.toHaveURL(/example\.com/);
  } finally {
    await prisma.$disconnect();
  }
});

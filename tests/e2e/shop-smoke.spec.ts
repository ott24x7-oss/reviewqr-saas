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

test("owner buys a combo, approves the proof, and the board shows Printing", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `shop-${stamp}@example.com`;
  const businessName = `Shop Cafe ${stamp}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await page.goto("/register");
    await page.getByLabel("Your name").fill("Shop Owner");
    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ShopTest1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");

    await page.goto("/dashboard/businesses");
    const manage = page.getByRole("link", { name: "Manage", exact: true });
    const href = await manage.getAttribute("href");
    const businessId = href?.match(/\/dashboard\/businesses\/([^/?#]+)/)?.[1];
    expect(businessId).toBeTruthy();
    await manage.click();
    await page.getByRole("main").getByRole("link", { name: /^QR codes/ }).click();
    await page.getByLabel("Label").fill("Front counter");
    await page.getByRole("button", { name: "Create QR code" }).click();
    await expect(page.getByText("Short URL")).toBeVisible();
    const shortUrl = await page.locator("code").first().innerText();
    const code = shortUrl.match(/\/q\/([^/?#\s]+)/)?.[1];
    expect(code, shortUrl).toBeTruthy();

    const device = await prisma.device.create({
      data: {
        shortCode: code!,
        kind: "STANDEE",
        status: "ASSIGNED",
        businessId: businessId!,
        chipUid: `E2E${stamp.toString(36).toUpperCase()}`
      }
    });

    await page.goto("/dashboard/shop/nfc-qr-combo");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto("/dashboard/shop/cart");
    await page.locator("#cart-business").selectOption(businessId!);
    await page.getByRole("button", { name: "Save cart" }).click();
    await expect(page.locator(`#COMBO-NFC-QR-qr option[value="${code}"]`)).toHaveCount(1);
    await page.locator("#COMBO-NFC-QR-template").selectOption("standee-4x6");
    await page.locator("#COMBO-NFC-QR-qr").selectOption(code!);
    await page.locator("#COMBO-NFC-QR-nfc").selectOption(device.id);
    await page.getByRole("button", { name: "Save cart" }).click();
    await expect(page.locator("#COMBO-NFC-QR-template")).toHaveValue("standee-4x6");

    await page.locator("#new-name").fill("Shop Owner");
    await page.locator("#new-phone").fill("9876543210");
    await page.locator("#new-line1").fill("12 MG Road");
    await page.locator("#new-city").fill("Bengaluru");
    await page.locator("#new-state").fill("Karnataka");
    await page.locator("#new-pincode").fill("560001");
    await page.getByRole("button", { name: "Shipping address" }).click();
    await expect(page.locator("#address option")).toHaveCount(2);
    await page.locator("#address").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Pay now" }).click();
    await page.waitForURL(/\/dashboard\/shop\/orders\/[^/]+$/, { timeout: 60_000 });
    const orderUrl = page.url();
    await expect(page.getByRole("heading", { name: "Paid" })).toBeVisible();

    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ShopTest1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard**");

    await page.goto("/admin/production");
    const card = page.getByRole("article").filter({ hasText: businessName });
    await card.getByRole("button", { name: "Send proof" }).click();
    const proofColumn = page.getByRole("region", { name: "Design proof sent" });
    await proofColumn.scrollIntoViewIfNeeded();
    await expect(proofColumn.getByText(businessName)).toBeVisible({ timeout: 60_000 });

    await page.goto(orderUrl);
    await page.getByRole("button", { name: "Approve proof" }).click();
    await expect(page.getByRole("heading", { name: "Customer approved" })).toBeVisible();

    await page.goto("/admin/production");
    const approved = page.getByRole("article").filter({ hasText: businessName });
    await approved.getByRole("button", { name: "Move to Printing" }).click();
    await page.setViewportSize({ width: 360, height: 800 });
    const printing = page.getByRole("region", { name: "Printing" });
    await printing.scrollIntoViewIfNeeded();
    await expect(printing.getByText(businessName)).toBeVisible();
  } finally {
    await prisma.$disconnect();
  }
});

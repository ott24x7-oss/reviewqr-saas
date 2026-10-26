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

async function registerWithEmail(
  page: import("@playwright/test").Page,
  input: { name: string; business: string; email: string; password: string }
) {
  await page.goto("/register");
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Your name").fill(input.name);
  await page.getByLabel("Business name").fill(input.business);
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard**");
}

test("owner buys a combo, approves the proof, and the board shows Printing", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `shop-${stamp}@example.com`;
  const businessName = `Shop Cafe ${stamp}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await registerWithEmail(page, {
      name: "Shop Owner",
      business: businessName,
      email,
      password: "ShopTest1"
    });

    await page.goto("/dashboard/account/settings?section=businesses");
    const manage = page.getByRole("link", { name: "Manage", exact: true });
    const href = await manage.getAttribute("href");
    const businessId = href?.match(/\/dashboard\/businesses\/([^/?#]+)/)?.[1];
    expect(businessId).toBeTruthy();
    await manage.click();
    await page.getByRole("link", { name: "QR codes & NFC" }).click();
    await page.getByRole("link", { name: "Create a code" }).click();
    await page.getByLabel(/^Label/).fill("Front counter");
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
    await page.getByRole("button", { name: "Use email instead" }).click();
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

test("owner adds products from the shop grid and the cart count follows", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await registerWithEmail(page, {
    name: "Grid Owner",
    business: `Grid Cafe ${stamp}`,
    email: `shop-grid-${stamp}@example.com`,
    password: "ShopTest1"
  });

  await page.goto("/dashboard/shop");
  const count = page.getByTestId("shop-cart-count");
  await expect(count).toHaveText("0");

  // Single-variant product: the card button adds straight away.
  const stand = page.getByRole("article", { name: "QR table stand" });
  await expect(stand.getByText(/% off/)).toBeVisible();
  await stand.getByRole("button", { name: "Add to cart" }).click();
  await expect(stand.getByRole("button", { name: "Added" })).toBeVisible();
  await expect(count).toHaveText("1");

  // Product with options: Choose opens the sheet, pick a pack, add.
  await page.getByRole("article", { name: "Table stickers" }).getByRole("button", { name: "Choose" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio", { name: /Pack of 10/ }).click();
  await sheet.getByRole("button", { name: /^Add to cart/ }).click();
  await expect(sheet.getByRole("link", { name: "View cart" })).toBeVisible();
  await expect(count).toHaveText("2");

  if (process.env.SHOP_SCREENSHOTS) {
    await page.keyboard.press("Escape");
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
      await page.reload();
      await expect(count).toHaveText("2");
      await page.screenshot({ path: `docs/shop/shop-grid-${width}.png`, fullPage: true });
    }
    await page.getByRole("article", { name: "Table stickers" }).getByRole("button", { name: "Choose" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(400); // let the sheet finish its open animation
    await page.screenshot({ path: "docs/shop/choose-sheet-1280.png" });
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 360, height: 800 });
    await page.getByRole("button", { name: "हिंदी" }).click();
    await page.getByRole("article", { name: "टेबल स्टिकर" }).getByRole("button", { name: "चुनें" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: "docs/shop/choose-sheet-hi-360.png" });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "English" }).click();
  }

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByTestId("shop-cart-link").click();
  await page.waitForURL("**/dashboard/shop/cart");
  await expect(page.getByText("QR table stand").first()).toBeVisible();
  await expect(page.getByText("Pack of 10").first()).toBeVisible();
});

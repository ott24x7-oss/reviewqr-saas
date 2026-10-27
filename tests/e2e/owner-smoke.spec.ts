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

test("owner registers, collects a private review, and sees UPI checkout", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `smoke-${Date.now()}@example.com`;
  const message = "The tea was cold and the wait was long";

  await page.goto("/register");
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Your name").fill("Smoke Owner");
  await page.getByLabel("Business name").fill("Smoke Cafe");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SmokeTest1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/dashboard**");

  await page.goto("/dashboard/account/settings?section=businesses");
  const manageLink = page.getByRole("link", { name: "Manage", exact: true });
  const manageHref = await manageLink.getAttribute("href");
  const businessId = manageHref?.match(/\/dashboard\/businesses\/([^/?#]+)/)?.[1];
  expect(businessId).toBeTruthy();
  await manageLink.click();
  await page.getByRole("link", { name: "Edit business details" }).click();
  await page.getByLabel("Google review URL").fill("https://search.google.com/local/writereview?placeid=smoke");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  await page.goBack();
  const reviewHref = await page.getByRole("link", { name: "Open live page" }).getAttribute("href");
  const reviewPath = new URL(reviewHref || "/r/missing", page.url()).pathname;
  await page.goto(reviewPath);
  await expect(page.getByRole("heading", { name: "Smoke Cafe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How was your experience?" })).toBeVisible();
  await page.goBack();
  await page.goto(`/dashboard/page/qr?tab=create&businessId=${businessId}`);
  await page.getByLabel(/^Label/).fill("Front counter");
  const qrCreated = page.waitForResponse((response) => response.url().includes(`/api/businesses/${businessId}/qr`) && response.request().method() === "POST");
  await page.getByRole("button", { name: "Create QR code" }).click();
  const createResponse = await qrCreated;
  expect(createResponse.ok()).toBeTruthy();
  await page.waitForURL((url) => url.pathname === "/dashboard/page/qr" && url.searchParams.get("tab") === "detail");
  await expect(page.getByText("Short URL")).toBeVisible();
  const shortUrl = await page.locator("code").first().innerText();
  const code = shortUrl.match(/\/q\/([^/?#\s]+)/)?.[1];
  expect(code, shortUrl).toBeTruthy();

  await page.goto(`/q/${code}`);
  await expect(page.getByRole("heading", { name: "Smoke Cafe" })).toBeVisible();
  await page.getByRole("button", { name: "Give Feedback" }).click();
  // Review gating is on by default: below the star threshold, no public review
  // link shows at all, and the private feedback form appears directly.
  await page.getByRole("button", { name: "2 stars" }).click();
  await page.getByLabel("What could we have done better?").fill(message);
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.getByText("Thank you for your feedback")).toBeVisible();

  await page.goto("/dashboard/feedback");
  await expect(page.getByText(message)).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.route(/https:\/\/wa\.me\//, (route) => route.abort());
  await page.goto(`/dashboard/account/settings?section=store&businessId=${businessId}`);
  await expect(page.getByLabel("Store layout"), page.url()).toBeVisible();
  await page.getByLabel("Store layout").selectOption("FOOD");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByText("Store settings saved").first()).toBeVisible();
  await page.goto(`/dashboard/sell/menu?businessId=${businessId}`);
  await page.getByLabel("Item name").fill("Smoke Coffee");
  await page.getByLabel("Price in rupees").fill("80");
  await page.getByRole("button", { name: "Add item" }).click();
  await expect(page.getByText("Smoke Coffee").first()).toBeVisible();

  await page.goto(`/q/${code}/menu`);
  await page.getByRole("button", { name: "Add Smoke Coffee" }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await page.getByRole("button", { name: "Order on WhatsApp" }).click();
  await page.waitForURL(/\/o\//);
  const foodNumber = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(foodNumber).toBeTruthy();
  await expect(page.getByRole("listitem").filter({ hasText: "New" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reorder" })).toBeVisible();

  await page.goto(`/dashboard/account/settings?section=store&businessId=${businessId}`);
  await page.getByLabel("Store layout").selectOption("SHOP");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByText("Store settings saved").first()).toBeVisible();
  await page.goto(`/q/${code}/menu`);
  await page.getByRole("button", { name: "Smoke Coffee" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await page.getByRole("button", { name: "Buy on WhatsApp" }).click();
  await page.waitForURL(/\/o\//);
  const shopNumber = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(shopNumber).not.toBe(foodNumber);

  await page.goto(`/dashboard/account/settings?section=store&businessId=${businessId}`);
  await page.getByRole("button", { name: "Premium Store" }).click();
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expect(page.getByText("Store settings saved").first()).toBeVisible();
  await page.goto(`/q/${code}/menu`);
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("button", { name: "Cart" }).first().click();
  await page.getByRole("button", { name: "Buy on WhatsApp" }).click();
  await page.waitForURL(/\/o\//);
  const premiumNumber = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  expect(premiumNumber).toBeTruthy();
  expect(premiumNumber).not.toBe(shopNumber);

  await page.goto("/dashboard/sell/orders");
  await expect(page.getByText(foodNumber, { exact: true })).toBeVisible();
  await expect(page.getByText(shopNumber, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: foodNumber, exact: true }).click();
  const drawer = page.getByRole("dialog");
  const popupPromise = page.waitForEvent("popup");
  await drawer.getByRole("link", { name: "Bill 58mm" }).click();
  const bill = await popupPromise;
  await expect(bill.getByText(`BILL ${foodNumber}`)).toBeVisible();
  await expect(bill.getByText("Smoke Coffee")).toBeVisible();
  await expect(bill.getByText("Total", { exact: true })).toBeVisible();
  await expect(bill.getByRole("button", { name: "Print" })).toBeVisible();
  await expect(bill.getByRole("link", { name: "80mm" })).toBeVisible();
  const pageCss = await bill.locator("style").evaluateAll((nodes) => nodes.map((node) => node.textContent || "").join("\n"));
  expect(pageCss).toContain("size: 58mm");

  await page.goto(`/dashboard/sell/menu?businessId=${businessId}`);
  await page.getByLabel("Quick add name").fill("Smoke Bun");
  await page.getByLabel("Quick add price").fill("40");
  await page.getByLabel("Quick add price").press("Enter");
  await expect(page.getByText("Smoke Bun").first()).toBeVisible();
  await page.getByLabel("Paste items").fill("Smoke Toast 45");
  await page.getByRole("button", { name: "Add these lines" }).click();
  await expect(page.getByLabel("Draft name 1")).toHaveValue("Smoke Toast");
  await expect(page.getByLabel("Draft price 1")).toHaveValue("45");

  await page.goto("/dashboard/account/plan");
  await page.getByRole("button", { name: "Upgrade" }).first().click();
  await expect(page.getByText(/Pay with UPI|GPay, PhonePe/)).toBeVisible();

  const printed = await page.request.post(`/api/businesses/${businessId}/print`, {
    data: {
      templateId: "cr80",
      preset: "exact",
      format: "pdf",
      name: "Smoke Cafe",
      cta: "Scan or tap to order and review",
      ctaHi: "",
      background: "#fff7ed",
      foreground: "#3a2016",
      qrDark: "#111111",
      qrLight: "#ffffff",
      module: "rounded",
      eye: "rounded",
      showNfc: true,
      showStars: true,
      codes: [{ code, label: "Front counter" }]
    }
  });
  if (!printed.ok()) {
    const detail = await printed.text().catch(() => "");
    throw new Error(`print failed ${printed.status()} ${detail.slice(0, 300)}`);
  }
  expect(printed.headers()["content-type"] || "").toContain("application/pdf");
  expect((await printed.body()).length).toBeGreaterThan(1000);

  const stock = `SMK${Date.now().toString(36).toUpperCase()}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  try {
    await prisma.qRCode.create({
      data: { shortCode: stock, label: "Stock", type: "CUSTOM", status: "UNASSIGNED", isActive: true }
    });
    await prisma.device.create({
      data: { shortCode: stock, kind: "CARD", status: "IN_STOCK", tableLabel: "Stock" }
    });
    await page.goto("/dashboard/page/qr?tab=activate");
    await page.getByPlaceholder("Printed code or QR link").fill(stock);
    await page.getByRole("button", { name: "Check code" }).click();
    await page.getByRole("button", { name: "Activate", exact: true }).click();
    await expect(page.getByText("QR activated")).toBeVisible();
    const device = await prisma.device.findUnique({ where: { shortCode: stock } });
    expect(device?.status).toBe("ACTIVE");
    const row = await prisma.qRCode.findUnique({ where: { shortCode: stock } });
    expect(row?.status).toBe("ACTIVE");
    expect(row?.businessId).toBe(businessId);
  } finally {
    await prisma.$disconnect();
  }
});

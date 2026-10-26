import { mkdirSync, readFileSync } from "node:fs";
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

test("a customer books a service and the owner sees the request", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `svc-book-${stamp}@example.com`;
  const code = `bk${String(stamp).slice(-8)}`;
  const customer = `Asha ${stamp}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const shots = path.join(process.cwd(), "docs", "services");
  mkdirSync(shots, { recursive: true });

  try {
    await page.goto("/register");
    await page.getByRole("button", { name: "Use email instead" }).click();
    await page.getByLabel("Your name").fill("Service Owner");
    await page.getByLabel("Business name").fill(`Salon ${stamp}`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("ServiceBook1");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    expect(user?.id).toBeTruthy();
    const business = await prisma.business.findFirst({ where: { ownerId: user!.id }, select: { id: true } });
    expect(business?.id).toBeTruthy();
    await prisma.business.update({
      where: { id: business!.id },
      data: { catalogMode: "SERVICES", whatsappNumber: "9876543210" }
    });
    await prisma.menuItem.create({
      data: {
        businessId: business!.id,
        name: "Haircut",
        pricePaise: 30000,
        durationMinutes: 45,
        kind: "SERVICE",
        priceType: "FIXED",
        bookable: true
      }
    });
    await prisma.qRCode.create({
      data: { businessId: business!.id, label: "Desk", shortCode: code, status: "ACTIVE", isActive: true }
    });

    await page.route(/wa\.me/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>WhatsApp</title><p>opened</p>" })
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/q/${code}/menu`);
    await expect(page.getByTestId("services-board")).toBeVisible();
    await expect(page.getByText("Haircut").first()).toBeVisible();
    await page.screenshot({ path: path.join(shots, "public-services-390.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(shots, "public-services-1440.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("book-open").click();
    await expect(page.getByTestId("book-sheet")).toBeVisible();
    await page.screenshot({ path: path.join(shots, "public-book-390.png") });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(shots, "public-book-1440.png") });

    const sheet = page.getByTestId("book-sheet");
    await sheet.getByLabel("Your name").fill(customer);
    await sheet.getByLabel("WhatsApp number").fill("9812345678");
    await sheet.getByRole("checkbox").check();
    const opened = page.waitForURL(/wa\.me/);
    await page.getByTestId("book-submit").click();
    await opened;

    await page.goto(`/dashboard/sell/bookings?businessId=${business!.id}`);
    await expect(page.getByText(customer)).toBeVisible();
    await page.screenshot({ path: path.join(shots, "owner-bookings-1440.png"), fullPage: true });
  } finally {
    await prisma.$disconnect();
  }
});

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

async function signInWithEmail(page: import("@playwright/test").Page, email: string, password: string) {
  if (!page.url().includes("/login")) await page.goto("/login");
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard**");
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
  await page.waitForURL(/\/(dashboard|login)(?:\?|$)/);
  if (page.url().includes("/login")) await signInWithEmail(page, input.email, input.password);
}

test("admin price, bullets and modules show on pricing and unlock the API", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const planName = `Gate Plan ${stamp}`;
  const slug = `gate-plan-${stamp}`;
  const bullet = `Gate bullet ${stamp}`;
  const adminEmail = `gate-admin-${stamp}@example.com`;
  const ownerEmail = `gate-owner-${stamp}@example.com`;
  const password = "PlansTest1";
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  let planId = "";

  try {
    await registerWithEmail(page, {
      name: "Gate Admin",
      business: `Gate Admin Cafe ${stamp}`,
      email: adminEmail,
      password
    });
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);

    await page.goto("/admin/plans");
    await page.getByRole("button", { name: "New plan" }).click();
    await page.getByLabel("Name (English)").fill(planName);
    await page.getByLabel("Name (Hindi)").fill("गेट प्लान");
    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("MONTH_1 price").fill("499");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText("Plan saved")).toBeVisible();

    const created = await prisma.plan.findUnique({ where: { slug }, select: { id: true, modules: true } });
    expect(created?.id).toBeTruthy();
    expect(created?.modules).toEqual(["REVIEWS"]);
    planId = created!.id;

    await page.context().clearCookies();
    await registerWithEmail(page, {
      name: "Gate Owner",
      business: `Gate Cafe ${stamp}`,
      email: ownerEmail,
      password
    });
    const owner = await prisma.user.findUnique({
      where: { email: ownerEmail },
      include: { businesses: { select: { id: true }, take: 1 } }
    });
    expect(owner?.businesses[0]?.id).toBeTruthy();
    const businessId = owner!.businesses[0]!.id;
    const endsAt = new Date("2027-08-01T00:00:00.000Z");
    await prisma.user.update({
      where: { id: owner!.id },
      data: { subscriptionTier: "STARTER", subscriptionStatus: "ACTIVE", subscriptionEndsAt: endsAt }
    });
    await prisma.subscription.create({
      data: {
        userId: owner!.id,
        planId,
        modules: ["REVIEWS"],
        limits: { businesses: 5, qrCodes: 10, products: 50, staff: 10, locations: 2 },
        tier: "STARTER",
        status: "ACTIVE",
        endsAt
      }
    });

    const locked = await page.request.get(`/api/v1/businesses/${businessId}/menu`);
    expect(locked.status()).toBe(403);
    const lockedBody = (await locked.json()) as { code?: string; feature?: string };
    expect(lockedBody.code).toBe("PLAN_REQUIRED");
    expect(lockedBody.feature).toBe("menu");

    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);
    await page.goto("/admin/plans");
    await page.locator("li").filter({ hasText: planName }).getByRole("button", { name: "Edit" }).click();
    await page.getByRole("checkbox", { name: "Menu" }).check();
    await page.getByLabel("MONTH_1 price").fill("777");
    await page.getByRole("button", { name: "Add bullet" }).click();
    await page.getByLabel("Bullet 1 English").fill(bullet);
    await page.getByLabel("Bullet 1 Hindi").fill("गेट बुलेट");
    await page.getByLabel("Bullet 1 show in comparison table").check();
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText("Plan saved")).toBeVisible();

    await page.goto("/pricing");
    await page.getByRole("button", { name: "Review + Menu" }).click();
    await page.getByRole("button", { name: "1 month" }).click();
    const card = page.locator(`[data-plan="${slug}"]`);
    await expect(card).toContainText(planName);
    await expect(card).toContainText("777");
    await expect(card).toContainText(bullet);
    await expect(page.locator("#plan-compare")).toContainText(bullet);

    await page.context().clearCookies();
    await signInWithEmail(page, ownerEmail, password);
    const open = await page.request.get(`/api/v1/businesses/${businessId}/menu`);
    expect(open.status()).toBe(200);
    const openBody = (await open.json()) as { code?: string };
    expect(openBody.code).not.toBe("PLAN_REQUIRED");
  } finally {
    if (planId) {
      await prisma.subscription.deleteMany({ where: { planId } });
      await prisma.plan.delete({ where: { id: planId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }
});

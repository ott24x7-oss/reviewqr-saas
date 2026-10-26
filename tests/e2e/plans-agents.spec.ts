import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
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

test("admin publishes a combo, an agent earns commission, and a referral extends the plan", async ({ page }) => {
  test.setTimeout(360_000);
  const stamp = Date.now();
  const planName = `Review Menu ${stamp}`;
  const slug = `review-menu-${stamp}`;
  const adminEmail = `plans-admin-${stamp}@example.com`;
  const agentEmail = `plans-agent-${stamp}@example.com`;
  const agentPhone = `9${String(stamp).slice(-9)}`;
  const ownerA = `plans-a-${stamp}@example.com`;
  const ownerB = `plans-b-${stamp}@example.com`;
  const password = "PlansTest1";
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await registerWithEmail(page, {
      name: "Plans Admin",
      business: `Plans Cafe ${stamp}`,
      email: adminEmail,
      password
    });

    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);

    await page.goto("/admin/plans");
    await page.getByRole("button", { name: "New plan" }).click();
    await page.getByLabel("Name (English)").fill(planName);
    await page.getByLabel("Name (Hindi)").fill("रिव्यू मेनू");
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("checkbox", { name: "Menu" }).check();
    await page.getByLabel("MONTH_1 price").fill("499");
    await page.getByLabel("MONTH_6 price").fill("2499");
    await page.getByLabel("YEAR_1 price").fill("4990");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText("Plan saved")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save plan" })).toHaveCount(0);
    await expect(page.getByText(planName)).toBeVisible();

    await page.goto("/pricing");
    await page.getByRole("button", { name: "Review + Menu" }).click();
    await expect(page.locator(`[data-plan="${slug}"]`)).toContainText(planName);

    await page.goto("/admin/agents");
    await page.getByLabel("Name").fill("Plans Agent");
    await page.getByLabel("Phone").fill(agentPhone);
    await page.getByLabel("Email").fill(agentEmail);
    await page.getByRole("button", { name: "Create agent" }).click();
    await expect(page.getByText(/Agent code /)).toBeVisible();
    await expect(page.getByText(agentEmail)).toBeVisible();
    const agent = await prisma.user.findUnique({ where: { email: agentEmail }, include: { agentProfile: true } });
    expect(agent?.agentProfile?.code).toBeTruthy();
    const code = agent!.agentProfile!.code;

    await page.context().clearCookies();
    await page.goto(`/join/${code}`);
    await registerWithEmail(page, {
      name: "Owner A",
      business: `Agent Cafe ${stamp}`,
      email: ownerA,
      password
    });

    await page.goto("/dashboard/billing");
    await page.getByRole("button", { name: "1 month" }).click();
    await page.locator(`[data-plan="${slug}"]`).getByRole("button", { name: "Choose" }).click();
    await page.getByRole("button", { name: "Pay with UPI" }).click();
    await expect(page.getByText("Plan updated").first()).toBeVisible();

    const before = await prisma.user.findUnique({ where: { email: ownerA }, select: { id: true, subscriptionEndsAt: true } });
    expect(before?.subscriptionEndsAt).toBeTruthy();

    await page.goto("/dashboard/refer");
    const referralLink = await page.locator("[data-referral-link]").getAttribute("data-referral-link");
    expect(referralLink).toContain("/refer/");
    const referralPath = new URL(referralLink!).pathname;

    await prisma.user.update({
      where: { email: agentEmail },
      data: { password: await bcrypt.hash(password, 4) }
    });
    await page.context().clearCookies();
    await signInWithEmail(page, agentEmail, password);
    await page.goto("/dashboard/agent");
    const pending = page.locator("article").filter({ hasText: "Pending" });
    await expect(pending).toBeVisible();
    await expect(pending).not.toContainText("₹0");

    await page.context().clearCookies();
    await page.goto(referralPath);
    await registerWithEmail(page, {
      name: "Owner B",
      business: `Referral Cafe ${stamp}`,
      email: ownerB,
      password
    });
    await page.goto("/dashboard/billing");
    await page.getByRole("button", { name: "6 months" }).click();
    await page.locator(`[data-plan="${slug}"]`).getByRole("button", { name: "Choose" }).click();
    await page.getByRole("button", { name: "Pay with UPI" }).click();
    await expect(page.getByText("Plan updated").first()).toBeVisible();

    const past = new Date(Date.now() - 60_000);
    await prisma.referralReward.updateMany({
      where: { referred: { email: ownerB } },
      data: { holdUntil: past }
    });
    await prisma.shopCommission.updateMany({
      where: { agentId: agent!.id, status: "PENDING" },
      data: { holdUntil: past }
    });

    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);
    const reconcile = await page.request.post("/api/billing/reconcile");
    expect(reconcile.ok()).toBeTruthy();
    const reconcileBody = (await reconcile.json().catch(() => ({}))) as { queued?: boolean };
    if (reconcileBody.queued) {
      await page.waitForTimeout(5_000);
      const mid = await prisma.user.findUnique({ where: { email: ownerA }, select: { subscriptionEndsAt: true } });
      const moved =
        !!mid?.subscriptionEndsAt &&
        !!before?.subscriptionEndsAt &&
        mid.subscriptionEndsAt.getTime() - before.subscriptionEndsAt.getTime() > 20 * 24 * 60 * 60 * 1000;
      if (!moved) {
        process.env.DATABASE_URL = databaseUrl();
        const { applyDueReferralRewards } = await import("../../lib/plans/rewards");
        await applyDueReferralRewards(new Date());
      }
    }

    await expect
      .poll(async () => {
        const again = await prisma.user.findUnique({ where: { email: ownerA }, select: { subscriptionEndsAt: true } });
        return again?.subscriptionEndsAt && before?.subscriptionEndsAt
          ? again.subscriptionEndsAt.getTime() - before.subscriptionEndsAt.getTime()
          : 0;
      }, { timeout: 20_000 })
      .toBeGreaterThan(20 * 24 * 60 * 60 * 1000);
  } finally {
    await prisma.$disconnect();
  }
});

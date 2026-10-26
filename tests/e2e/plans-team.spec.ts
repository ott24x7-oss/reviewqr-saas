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

test("a leader's member sale splits into SALE and TEAM_OVERRIDE", async ({ page }) => {
  test.setTimeout(360_000);
  const stamp = Date.now();
  const planName = `Team Plan ${stamp}`;
  const slug = `team-plan-${stamp}`;
  const adminEmail = `team-admin-${stamp}@example.com`;
  const leaderEmail = `team-leader-${stamp}@example.com`;
  const leaderPhone = `8${String(stamp).slice(-9)}`;
  const memberEmail = `team-member-${stamp}@example.com`;
  const ownerEmail = `team-owner-${stamp}@example.com`;
  const password = "TeamTest1";
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });

  try {
    await registerWithEmail(page, {
      name: "Team Admin",
      business: `Team Admin Cafe ${stamp}`,
      email: adminEmail,
      password
    });
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);

    await page.goto("/admin/plans");
    await page.getByRole("button", { name: "New plan" }).click();
    await page.getByLabel("Name (English)").fill(planName);
    await page.getByLabel("Name (Hindi)").fill("टीम प्लान");
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("checkbox", { name: "Menu" }).check();
    await page.getByLabel("MONTH_1 price").fill("499");
    await page.getByLabel("MONTH_6 price").fill("2499");
    await page.getByLabel("YEAR_1 price").fill("4990");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText("Plan saved")).toBeVisible();

    await page.goto("/admin/agents");
    await page.getByLabel("Name").fill("Team Leader");
    await page.getByLabel("Phone").fill(leaderPhone);
    await page.getByLabel("Email").fill(leaderEmail);
    await page.getByRole("button", { name: "Create agent" }).click();
    await expect(page.getByText(/Agent code /)).toBeVisible();
    const leader = await prisma.user.findUnique({ where: { email: leaderEmail }, include: { agentProfile: true } });
    expect(leader?.agentProfile?.code).toBeTruthy();

    await prisma.user.update({ where: { email: leaderEmail }, data: { password: await bcrypt.hash(password, 4) } });
    await page.context().clearCookies();
    await signInWithEmail(page, leaderEmail, password);
    const invited = await page.request.post("/api/v1/agent/team/invite", { data: {} });
    expect(invited.ok()).toBeTruthy();
    const inviteBody = (await invited.json()) as { data?: { code?: string } };
    const inviteCode = inviteBody.data?.code || "";
    expect(inviteCode).toMatch(/^[A-Z0-9]+$/);
    await page.goto("/dashboard/agent/team");
    await expect(page.getByRole("heading", { name: "Invite" })).toBeVisible();
    await expect(page.getByText("There is no joining fee. A member earns only from real sales.")).toBeVisible();
    await expect(page.getByRole("img", { name: "Invite QR" })).toBeVisible();
    await page.goto("/dashboard/agent/how");
    await expect(page.getByRole("heading", { name: "How team earnings work" })).toBeVisible();
    await page.getByRole("button", { name: "हिन्दी" }).click();
    await expect(page.getByRole("heading", { name: "टीम की कमाई कैसे होती है" })).toBeVisible();
    await page.goto("/dashboard/agent/earnings");
    await expect(page.getByRole("heading", { name: "Earnings" })).toBeVisible();
    await page.goto("/dashboard/agent/payouts");
    await expect(page.getByRole("link", { name: "Download CSV" })).toBeVisible();
    await page.goto("/dashboard/agent/profile");
    await expect(page.getByLabel("PAN")).toBeVisible();

    await page.context().clearCookies();
    await registerWithEmail(page, {
      name: "Team Member",
      business: `Member Cafe ${stamp}`,
      email: memberEmail,
      password
    });
    await page.goto(`/agent/join/${inviteCode}`);
    await expect(page.getByText("There is no joining fee.")).toBeVisible();
    await page.getByRole("button", { name: "Join this team" }).click();
    await page.waitForURL("**/dashboard/agent**");
    const member = await prisma.user.findUnique({ where: { email: memberEmail }, include: { agentProfile: true } });
    expect(member?.agentProfile?.status).toBe("PENDING");
    expect(await prisma.shopCommission.count({ where: { agentId: member!.id } })).toBe(0);

    await page.context().clearCookies();
    await signInWithEmail(page, adminEmail, password);
    await page.goto("/admin/agents");
    await expect(page.getByText(leaderPhone).first()).toBeVisible();
    await expect(page.getByText(`No phone · PENDING · depth 2 · ${member!.agentProfile!.code}`)).toBeVisible();
    await expect(page.getByLabel("Max team depth")).toBeVisible();
    await expect(page.getByLabel("TDS percent")).toBeVisible();
    const approved = await page.request.post(`/api/admin/agents/${member!.agentProfile!.id}`, { data: { action: "approve" } });
    expect(approved.ok()).toBeTruthy();

    await page.context().clearCookies();
    await signInWithEmail(page, leaderEmail, password);
    const shared = await page.request.patch(`/api/v1/agent/team/${member!.id}`, { data: { sharePercent: 70 } });
    expect(shared.ok()).toBeTruthy();
    await prisma.commissionRule.create({
      data: {
        agentId: member!.id,
        hardware: false,
        firstBasis: "FLAT",
        firstFlatPaise: 20000,
        renewalBasis: "FLAT",
        renewalFlatPaise: 20000
      }
    });

    await page.context().clearCookies();
    await page.goto(`/join/${member!.agentProfile!.code}`);
    await registerWithEmail(page, {
      name: "Team Owner",
      business: `Sold Cafe ${stamp}`,
      email: ownerEmail,
      password
    });
    await page.goto("/dashboard/billing");
    await page.getByRole("button", { name: "1 month" }).click();
    await page.locator(`[data-plan="${slug}"]`).getByRole("button", { name: "Choose" }).click();
    await page.getByRole("button", { name: "Pay with UPI" }).click();
    await expect(page.getByText("Plan updated").first()).toBeVisible();

    const owner = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { id: true } });
    const payment = await prisma.payment.findFirst({
      where: { userId: owner!.id, status: "COMPLETED" },
      orderBy: { createdAt: "desc" }
    });
    expect(payment).toBeTruthy();
    const rows = await prisma.shopCommission.findMany({ where: { paymentId: payment!.id } });
    const sale = rows.find((row) => row.kind === "SALE");
    const override = rows.find((row) => row.kind === "TEAM_OVERRIDE");
    expect(sale).toMatchObject({ agentId: member!.id, amountPaise: 14000, sharePercent: 70 });
    expect(override).toMatchObject({ agentId: leader!.id, amountPaise: 6000 });
    expect(rows.reduce((sum, row) => sum + row.amountPaise, 0)).toBe(20000);
  } finally {
    await prisma.$disconnect();
  }
});

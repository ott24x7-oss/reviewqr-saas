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

test("approving an admin phone on the web lets that device call the API", async ({ page }) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  const email = `admin-device-${stamp}@example.com`;
  const password = "AdminDevice1";
  const phone = `9${String(stamp).slice(-9)}`;
  const deviceName = `Play ${stamp}`;
  const ip = `10.${Number(String(stamp).slice(-9, -6)) % 200}.${Number(String(stamp).slice(-6, -3)) % 200}.${Number(String(stamp).slice(-3)) % 200}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const api = { timeout: 120_000, headers: { "x-forwarded-for": ip } };

  try {
    await registerWithEmail(page, {
      name: "Device Admin",
      business: `Device Cafe ${stamp}`,
      email,
      password
    });
    await prisma.user.update({ where: { email }, data: { role: "ADMIN", phone } });
    await page.context().clearCookies();
    await signInWithEmail(page, email, password);

    const requested = await page.request.post("/api/v1/admin/auth/otp/request", { ...api, data: { phone } });
    expect(requested.status()).toBe(200);
    const requestedBody = await requested.json();
    expect(requestedBody.data.devCode).toMatch(/^\d{6}$/);

    const verified = await page.request.post("/api/v1/admin/auth/otp/verify", {
      ...api,
      data: { phone, code: requestedBody.data.devCode, deviceName, platform: "android" }
    });
    expect(verified.status()).toBe(200);
    const session = await verified.json();
    expect(session.data.device.status).toBe("PENDING");
    const token = session.data.accessToken as string;

    const blocked = await page.request.get("/api/v1/admin/dashboard", {
      timeout: 120_000,
      headers: { authorization: `Bearer ${token}`, "x-forwarded-for": ip }
    });
    expect(blocked.status()).toBe(403);
    expect((await blocked.json()).error.code).toBe("DEVICE_PENDING");

    await page.goto("/admin/app", { timeout: 120_000 });
    await expect(page.getByRole("heading", { name: "Admin devices" })).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(deviceName) });
    // Approving needs a single-use step-up code bound to approve_device.
    const stepUpSent = page.waitForResponse(
      (res) => res.url().includes("/api/admin/step-up") && res.request().method() === "POST" && !res.request().postData()?.includes("code"),
      { timeout: 120_000 }
    );
    await row.getByRole("button", { name: "Approve" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm device approval" });
    await expect(dialog).toBeVisible();
    const stepBody = await (await stepUpSent).json();
    expect(stepBody.devCode).toMatch(/^\d{6}$/);
    await page.locator("#admin-step-code").fill(stepBody.devCode);
    await dialog.getByRole("button", { name: "Confirm" }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(row).toContainText("ACTIVE");

    const open = await page.request.get("/api/v1/admin/dashboard?range=today", {
      timeout: 120_000,
      headers: { authorization: `Bearer ${token}`, "x-forwarded-for": ip }
    });
    expect(open.status()).toBe(200);
    const body = await open.json();
    expect(typeof body.data.kpis.revenuePaise).toBe("number");
  } finally {
    await prisma.emailOtp.deleteMany({ where: { identifier: phone } });
    const admin = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (admin) {
      await prisma.emailOtp.deleteMany({ where: { identifier: admin.id } });
      await prisma.rateLimit.deleteMany({ where: { key: { contains: admin.id } } });
    }
    await prisma.rateLimit.deleteMany({ where: { OR: [{ key: { contains: phone } }, { key: { contains: ip } }] } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
});

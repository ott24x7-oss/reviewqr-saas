import { expect, test } from "@playwright/test";

test("otp login reads me, logout succeeds, and a used refresh token fails", async ({ request }) => {
  test.setTimeout(180_000);
  const phone = `9${String(Date.now()).slice(-9)}`;
  const email = `otp-${Date.now()}@example.test`;

  const registered = await request.post("/api/auth/register", {
    data: { name: "OTP Smoke", email, password: "SmokeTest1", phone }
  });
  expect(registered.status()).toBe(200);

  const sent = await request.post("/api/v1/auth/otp/request", { data: { phone } });
  expect(sent.status()).toBe(200);
  expect(sent.headers()["x-request-id"]).toBeTruthy();
  const sentBody = await sent.json();
  expect(sentBody.data?.devCode).toMatch(/^\d{6}$/);

  const verified = await request.post("/api/v1/auth/otp/verify", {
    data: { phone, code: sentBody.data.devCode, deviceName: "otp-smoke" }
  });
  expect(verified.status()).toBe(200);
  const verifiedBody = await verified.json();
  const accessToken = verifiedBody.data.accessToken as string;
  const refreshA = verifiedBody.data.refreshToken as string;

  const me = await request.get("/api/v1/me", {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  expect(me.status()).toBe(200);
  const meBody = await me.json();
  expect(meBody.data.email).toBe(email);
  expect(meBody.data.phone).toContain(phone);

  const rotated = await request.post("/api/v1/auth/refresh", { data: { refreshToken: refreshA } });
  expect(rotated.status()).toBe(200);
  const rotatedBody = await rotated.json();
  const refreshB = rotatedBody.data.refreshToken as string;

  const loggedOut = await request.post("/api/v1/auth/logout", { data: { refreshToken: refreshB } });
  expect(loggedOut.status()).toBe(200);
  const loggedOutBody = await loggedOut.json();
  expect(loggedOutBody.data.ok).toBe(true);

  const again = await request.post("/api/v1/auth/refresh", { data: { refreshToken: refreshA } });
  expect(again.status()).toBe(401);
  const afterLogout = await request.post("/api/v1/auth/refresh", { data: { refreshToken: refreshB } });
  expect(afterLogout.status()).toBe(401);
});

test("settings switch saves push through the shared client", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `push-${Date.now()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("Your name").fill("Push Smoke");
  await page.getByLabel("Business name").fill("Push Cafe");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SmokeTest1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/login"));
  if (page.url().includes("/login")) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("SmokeTest1");
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await page.waitForURL("**/dashboard**");

  await page.goto("/dashboard/settings");
  const toggle = page.getByRole("switch", {
    name: "Push notifications for orders, feedback, and plan reminders"
  });
  await expect(toggle).toBeChecked();
  const saved = page.waitForResponse(
    (res) => res.url().includes("/api/v1/me") && res.request().method() === "PATCH"
  );
  await toggle.click();
  const res = await saved;
  expect(res.status()).toBe(200);
  await expect(toggle).not.toBeChecked();
});

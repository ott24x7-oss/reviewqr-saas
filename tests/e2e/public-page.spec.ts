import { expect, test } from "@playwright/test";

test("a new business page shows the name, buttons, and menu", async ({ page, request }) => {
  const stamp = Date.now().toString().slice(-8);
  const phone = `9${stamp}01`;
  const requested = await request.post("/api/v1/auth/otp/signup", { data: { action: "request", phone } });
  expect(requested.ok()).toBeTruthy();
  const sent = await requested.json();
  const devCode = sent.data?.devCode as string;
  expect(devCode).toMatch(/^\d{6}$/);

  const confirmed = await request.post("/api/v1/auth/otp/signup", {
    data: { action: "confirm", phone, code: devCode }
  });
  expect(confirmed.ok()).toBeTruthy();
  const proof = await confirmed.json();

  const finished = await request.post("/api/v1/auth/otp/signup", {
    data: {
      action: "finish",
      phone,
      signupToken: proof.data.signupToken,
      name: "Page Owner",
      deviceName: "Playwright"
    }
  });
  expect(finished.ok()).toBeTruthy();
  const tokens = await finished.json();
  const headers = { authorization: `Bearer ${tokens.data.accessToken}` };
  const slug = `mango-${stamp}`;

  const saved = await request.put("/api/v1/onboarding", {
    headers,
    data: {
      step: 4,
      referralAsked: true,
      draft: {
        name: `Mango ${stamp}`,
        category: "cafe",
        city: "Pune",
        whatsapp: phone,
        themeId: "sunset-mango",
        slug,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=demo",
        items: [{ name: "Masala chai", price: "40" }]
      }
    }
  });
  expect(saved.ok()).toBeTruthy();

  const created = await request.post("/api/v1/onboarding/finish", { headers, data: {} });
  expect(created.ok()).toBeTruthy();
  const body = await created.json();
  const scanPath = new URL(body.data.scanUrl).pathname;

  await page.goto(scanPath);
  await expect(page.getByRole("heading", { name: `Mango ${stamp}` })).toBeVisible();
  await expect(page.getByRole("link").first()).toBeVisible();
  await expect(page.getByTestId("public-menu")).toContainText("Masala chai");
});

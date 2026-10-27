import { expect, test, type APIRequestContext } from "@playwright/test";

let signupSequence = 0;

async function onboardBusiness(
  request: APIRequestContext,
  category: string,
  items: { name: string; price: string }[] = []
) {
  signupSequence += 1;
  const stamp = `${Date.now().toString().slice(-7)}${signupSequence}`;
  const phone = `9${stamp}0`;
  const name = `${category} ${stamp}`;
  const slug = `${category}-${stamp}`;

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

  const saved = await request.put("/api/v1/onboarding", {
    headers,
    data: {
      step: 4,
      referralAsked: true,
      draft: {
        name,
        category,
        city: "Pune",
        whatsapp: phone,
        themeId: "sunset-mango",
        slug,
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=demo",
        items
      }
    }
  });
  expect(saved.ok()).toBeTruthy();

  const created = await request.post("/api/v1/onboarding/finish", { headers, data: {} });
  expect(created.ok(), `Onboarding finish failed (${created.status()}): ${await created.text()}`).toBeTruthy();
  const body = await created.json();
  const scanUrl = new URL(body.data.scanUrl);
  const code = scanUrl.pathname.split("/").pop();
  expect(code).toBeTruthy();

  return { headers, businessId: body.data.businessId as string, name, code: code as string };
}

test("cafe public store keeps dine-in and takeaway options", async ({ page, request }) => {
  const cafe = await onboardBusiness(request, "cafe", [{ name: "Masala chai", price: "40" }]);

  await page.goto(`/q/${cafe.code}`);
  await expect(page.getByRole("heading", { name: cafe.name })).toBeVisible();
  await expect(page.getByRole("link").first()).toBeVisible();
  await expect(page.getByTestId("public-menu")).toContainText("Masala chai");

  await page.goto(`/q/${cafe.code}/menu`);
  await page.getByRole("button", { name: "Add Masala chai" }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await expect(page.getByRole("button", { name: "Dine-in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Takeaway" })).toBeVisible();
});

test("salon public page hides ordering types and shop offers delivery only", async ({ page, request }) => {
  const salon = await onboardBusiness(request, "salon");
  const savedSettings = await request.put(`/api/v1/businesses/${salon.businessId}/store`, {
    headers: salon.headers,
    data: {
      holiday: false,
      hours: { sun: null, mon: null, tue: null, wed: null, thu: null, fri: null, sat: null },
      dineIn: true,
      takeaway: true,
      delivery: false,
      deliveryPincodes: "",
      deliveryChargeRupees: 0,
      freeDeliveryAboveRupees: null,
      minOrderRupees: 0,
      packingChargeRupees: 0,
      gstEnabled: false,
      gstPercent: 5,
      pricesIncludeGst: true,
      prepMinutes: 20,
      upiId: "",
      layout: "AUTO",
      design: "CLASSIC"
    }
  });
  expect(savedSettings.ok()).toBeTruthy();

  await page.goto(`/q/${salon.code}/menu`);
  await expect(page.locator('.store-page[data-catalog="SERVICES"]')).toBeVisible();
  await expect(page.getByText("Dine-in", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Takeaway", { exact: true })).toHaveCount(0);

  const shop = await onboardBusiness(request, "shop", [{ name: "Notebook", price: "99" }]);
  await page.goto(`/q/${shop.code}/menu`);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "View cart" }).click();
  await expect(page.getByRole("button", { name: "Home delivery" })).toBeVisible();
  await expect(page.getByText("Dine-in", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Takeaway", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/book.*service/i)).toHaveCount(0);
});

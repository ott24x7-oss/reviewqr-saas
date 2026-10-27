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

  return { headers, businessId: body.data.businessId as string, name, slug, code: code as string };
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

test("gated 4–5-star visits can pick, edit, copy, and continue on /r and /q", async ({ page, request }) => {
  const business = await onboardBusiness(request, "cafe");
  const configured = await request.patch(`/api/v1/businesses/${business.businessId}`, {
    headers: business.headers,
    data: {
      reviewGating: true,
      aiReviewsEnabled: true,
      reviewQaSpecialty: "Family recipes made fresh each morning",
      reviewQaBestKnown: "Mango lassi",
      reviewQaAtmosphere: "Relaxed courtyard seating"
    }
  });
  expect(configured.ok()).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  let copiedText = "";
  await page.exposeFunction("captureReviewText", (text: string) => { copiedText = text; });
  await page.addInitScript(() => {
    const scope = window as typeof window & { captureReviewText: (text: string) => Promise<void> };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (text: string) => scope.captureReviewText(text) }
    });
  });
  await page.context().route("https://search.google.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "Review destination" })
  );
  await page.route("**/api/public/ai/review-drafts", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        drafts: [
          "A lovely visit at Mango House—[what you enjoyed].",
          "I came to Mango House for [reason] and especially liked [detail].",
          "Mango House has a relaxed feel; [your own thought].",
          "The mango lassi was a highlight—[what stood out to you].",
          "The courtyard seating made my visit feel [your description].",
          "A nice neighbourhood spot for [what you enjoyed]."
        ]
      })
    })
  );

  await page.goto(`/r/${business.slug}`);
  await page.getByRole("button", { name: "5 stars" }).click();
  await expect(page.getByRole("heading", { name: "Choose a starting point" })).toBeVisible();
  await page.screenshot({ path: "docs/review-ai/rating-to-ai-picker-390.png", fullPage: true });
  await page.getByRole("button", { name: /Short & punchy/ }).click();
  await page.getByLabel("Edit your review").fill("I loved the mango lassi and courtyard seating.");
  await page.screenshot({ path: "docs/review-ai/rating-ai-draft-editor-390.png", fullPage: true });
  await page.getByRole("button", { name: "Copy & continue to Google" }).click();
  await expect(page).toHaveURL(/search\.google\.com/);
  expect(copiedText).toBe("I loved the mango lassi and courtyard seating.");

  await page.goto(`/q/${business.code}`);
  await page.getByRole("button", { name: /Give Feedback/ }).click();
  await page.getByRole("button", { name: "4 stars" }).click();
  await expect(page.getByRole("heading", { name: "Choose a starting point" })).toBeVisible();
  await page.screenshot({ path: "docs/review-ai/tap-rating-ai-picker-390.png", fullPage: true });
  await page.getByRole("button", { name: "Write my own instead" }).click();
  await page.getByLabel("Edit your review").fill("I enjoyed the relaxed courtyard.");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Copy & continue to Google" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/search\.google\.com/);
  expect(copiedText).toBe("I enjoyed the relaxed courtyard.");
});

test("1–3-star ratings still reach private feedback on /r and /q", async ({ page, request }) => {
  const business = await onboardBusiness(request, "cafe");
  const configured = await request.patch(`/api/v1/businesses/${business.businessId}`, {
    headers: business.headers,
    data: { reviewGating: true, aiReviewsEnabled: true }
  });
  expect(configured.ok()).toBeTruthy();

  await page.goto(`/r/${business.slug}`);
  await page.getByRole("button", { name: "2 stars" }).click();
  await expect(page.getByRole("heading", { name: "We'd love to hear more" })).toBeVisible();
  await expect(page.getByLabel(/What could we have done better/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose a starting point" })).toHaveCount(0);

  await page.goto(`/q/${business.code}`);
  await page.getByRole("button", { name: /Give Feedback/ }).click();
  await page.getByRole("button", { name: "3 stars" }).click();
  await expect(page.getByLabel("What could we have done better?")).toBeVisible();
  await expect(page.getByText("Review on Google", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Choose a starting point" })).toHaveCount(0);
});

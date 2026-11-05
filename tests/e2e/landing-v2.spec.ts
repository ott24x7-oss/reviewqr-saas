import { expect, test } from "@playwright/test";

const howSteps = ["choose", "ship", "setup", "scan", "results", "track"];

test("home keeps the design and its section links usable at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  await expect(page.locator(".qr-header-home")).toBeVisible();
  await expect(page.locator(".qr-home-h1")).toHaveText("Get more Google reviews with one QR + NFC stand");
  await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
  await expect(page.locator(".qr-home-hero img")).toHaveCount(0);
  await expect(page.locator("#features")).toBeVisible();
  await expect(page.locator("#how")).toBeAttached();
  await expect(page.locator("#pricing")).toBeAttached();
  await expect(page.locator("#shop")).toBeAttached();
  await expect(page.getByText("+38 reviews", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Rajesh Sharma", { exact: false })).toHaveCount(0);

  for (const width of [360, 375, 390, 414]) {
    await page.setViewportSize({ width, height: 800 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(fits).toBe(true);
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#features");
  await expect(page).toHaveURL(/\/#features$/);
  await expect(page.locator("#features")).toBeVisible();
});

test("Hindi home keeps its localized headline and language links", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/hi");
  await expect(page.locator(".qr-home-h1")).toHaveText("एक QR + NFC स्टैंड से Google पर ज़्यादा रिव्यू पाएँ");
  await expect(page.getByRole("link", { name: "English" }).first()).toHaveAttribute("href", "/");
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#how")).toBeAttached();
});

test("home uses the review policy in the FAQ and FAQ structured data", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const faq = page.locator(".qr-faq-item", { hasText: "Do you ask every customer equally?" });
  await expect(faq).toBeAttached();
  await faq.locator("summary").click();
  await expect(faq).toContainText("We do not filter or hide unhappy customers from the public link");
  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.join(" ")).toContain("Do you ask every customer equally?");
  expect(structuredData.join(" ")).toContain("We do not filter or hide unhappy customers from the public link");
});

test("stand cards link to the actual shop product pages", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const productLinks = page.locator("#shop .qr-home-shop-card > a.qr-button");
  if (await productLinks.count()) {
    await expect(productLinks.first()).toHaveAttribute("href", /^\/dashboard\/shop\//);
  }
  await expect(page.locator("#shop a.qr-home-inline-link")).toHaveAttribute("href", "/dashboard/shop");
});

test("how it works renders every step", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/how-it-works");
  for (const id of howSteps) await expect(page.locator(`[data-step="${id}"]`)).toBeVisible();
});

test("every home image has alt text", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const missing = await page.evaluate(() =>
    [...document.images].filter((img) => img.getAttribute("alt") === null).map((img) => img.currentSrc || img.src)
  );
  expect(missing).toEqual([]);
});

test("a real plan details link opens the plan page on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const details = page.locator(".qr-plan-actions a[href^='/plans/']").first();
  if (!(await details.count())) {
    await expect(page.getByText("Plans will be available soon.")).toBeVisible();
    return;
  }
  await expect(details).toBeVisible();
  const href = await details.getAttribute("href");
  expect(href).toMatch(/^\/plans\//);
  await page.goto(href!);
  await expect(page.locator("h1")).toBeVisible();
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(fits).toBe(true);
});

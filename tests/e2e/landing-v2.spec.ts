import { expect, test } from "@playwright/test";

const steps = ["choose", "ship", "setup", "scan", "results", "track"];

test("landing at 360px shows the hero buy button on the first screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/");
  const buy = page.locator("#sell-hero").getByRole("link", { name: "Buy now" });
  await expect(buy).toBeVisible();
  const box = await buy.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y + box!.height).toBeLessThanOrEqual(640);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(fits).toBe(true);
  await page.screenshot({ path: "docs/landing/home-360.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "docs/landing/home-1280.png" });
});

test("a phone shows at most six plan cards until See all plans", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const cards = page.locator("[data-plan-card]");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  let shown = 0;
  for (let index = 0; index < count; index += 1) {
    if (await cards.nth(index).isVisible()) shown += 1;
  }
  expect(shown).toBeLessThanOrEqual(6);
  if (count > 6) {
    await page.getByRole("button", { name: "See all plans" }).click();
    await expect(cards.nth(6)).toBeVisible();
  }
});

test("adjacent plan cards do not share an image", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const cards = page.locator("[data-plan-card]");
  await expect(cards.first()).toBeVisible();
  const srcs: string[] = [];
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (!(await card.isVisible())) continue;
    const src = await card.getAttribute("data-card-image");
    expect(src).toBeTruthy();
    srcs.push(src!);
  }
  expect(srcs.length).toBeGreaterThan(1);
  for (let index = 1; index < srcs.length; index += 1) {
    expect(srcs[index]).not.toBe(srcs[index - 1]);
    if (index >= 2) expect(srcs[index]).not.toBe(srcs[index - 2]);
  }
});

test("the home price anchor is a paid monthly price", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const anchor = page.locator("#sell-hero [data-price-anchor]");
  await expect(anchor).toBeVisible();
  const paise = Number(await anchor.getAttribute("data-price-anchor"));
  expect(paise).toBeGreaterThan(0);
  await expect(anchor).not.toContainText(/₹\s*0(?:\D|$)/);
  await expect(page.locator("#sell-hero").getByRole("link", { name: "Start free" })).toBeVisible();
});

test("a duration chip changes the price and Buy now opens signup", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const cards = page.locator("[data-plan-card]");
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  let bought = false;
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const price = card.locator("[data-price]");
    const before = (await price.innerText()).trim();
    const target = card.locator("button[aria-pressed='false']").first();
    if ((await target.count()) === 0) continue;
    const nextDuration = await target.getAttribute("data-duration");
    await target.click();
    const after = (await price.innerText()).trim();
    if (after === before || !nextDuration) continue;
    await expect(price).toHaveAttribute("data-duration", nextDuration);
    await card.getByRole("link", { name: "Buy now" }).click();
    await expect(page).toHaveURL(new RegExp(`/register\\?plan=[^&]+&duration=${nextDuration}`));
    bought = true;
    break;
  }
  expect(bought).toBe(true);
});

test("how it works renders every step", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/how-it-works");
  for (const id of steps) {
    await expect(page.locator(`[data-step="${id}"]`)).toBeVisible();
  }
  await page.screenshot({ path: "docs/landing/how-360.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "docs/landing/how-1280.png" });
});

test("reduced motion shows the steps without hiding them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/how-it-works");
  const step = page.locator("[data-step='track']");
  await expect(step).toBeVisible();
  const opacity = await step.evaluate((element) => getComputedStyle(element).opacity);
  expect(opacity).toBe("1");
  const pane = page.locator(".how-pane").first();
  const animated = await pane.evaluate((element) => getComputedStyle(element).animationName);
  expect(animated).toBe("none");
});

const moved = ["story", "features", "how", "profile", "store", "reviews", "products", "growth", "industries"];

test("home at 375px stays under 9000px and old sections live on /features", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/#features");
  await expect(page).toHaveURL(/\/features#features$/);
  await expect(page.locator("#features")).toBeVisible();
  for (const id of moved) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  await expect(page.getByRole("heading", { name: /One smart stand/ })).toBeVisible();
  await page.screenshot({ path: "docs/landing/features-375.png", fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "docs/landing/features-1280.png", fullPage: false });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await expect(page.locator("#sell-hero")).toBeVisible();
  await expect(page.locator("#features")).toHaveCount(0);
  await expect(page.locator("#story")).toHaveCount(0);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(9000);
  await page.screenshot({ path: "docs/landing/home-375.png", fullPage: false });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: "docs/landing/home-1280.png", fullPage: false });
});

test("a plan page keeps the buy bar on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const details = page.getByRole("link", { name: "Details" }).first();
  await expect(details).toBeVisible();
  const href = await details.getAttribute("href");
  expect(href).toMatch(/^\/plans\//);
  await page.goto(href!);
  await expect(page.locator("h1")).toBeVisible();
  await page.screenshot({ path: "docs/landing/plan-1280.png" });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.screenshot({ path: "docs/landing/plan-360.png" });
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(fits).toBe(true);
});

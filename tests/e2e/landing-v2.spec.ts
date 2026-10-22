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

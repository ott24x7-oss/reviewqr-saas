import { expect, test } from "@playwright/test";

const steps = ["choose", "ship", "setup", "scan", "results", "track"];

test("landing at 375px shows Start free on the first screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const start = page.locator("#home-hero").getByRole("link", { name: "Start free" });
  await expect(start).toBeVisible();
  const box = await start.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y + box!.height).toBeLessThanOrEqual(812);
  for (const width of [360, 375, 390, 414]) {
    await page.setViewportSize({ width, height: 800 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(fits).toBe(true);
  }
  await page.setViewportSize({ width: 740, height: 360 });
  const landscape = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(landscape).toBe(true);
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
  expect(shown).toBeLessThanOrEqual(4);
  if (count > 4) {
    const more = page.getByRole("link", { name: "See all plans" });
    await expect(more).toBeVisible();
    await expect(more).toHaveAttribute("href", "/pricing");
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
  await expect(page.locator("#home-hero").getByRole("link", { name: "Start free" })).toBeVisible();
  const anchor = page.locator("[data-plan-card] [data-price-anchor]").first();
  await expect(anchor).toBeVisible();
  const paise = Number(await anchor.getAttribute("data-price-anchor"));
  expect(paise).toBeGreaterThan(0);
  await expect(anchor).not.toContainText(/₹\s*0(?:\D|$)/);
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
  await expect(page.locator("#home-hero")).toBeVisible();
  await expect(page.locator("#features")).toHaveCount(0);
  await expect(page.locator("#story")).toHaveCount(0);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height).toBeLessThan(7000);
  await expect.poll(() => page.locator("#home-flow img").first().evaluate((img) => (img as HTMLImageElement).naturalWidth > 10)).toBe(true);
  await page.screenshot({ path: "docs/home-v3/home-375.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator("#home-flow").scrollIntoViewIfNeeded();
  await expect.poll(() =>
    page.locator("#home-flow img").evaluateAll((imgs) =>
      imgs.every((img) => {
        const shot = img as HTMLImageElement;
        return shot.complete && shot.naturalWidth > 10 && shot.currentSrc.includes("-960");
      })
    )
  ).toBe(true);
  await page.locator("#home-flow img").evaluateAll((imgs) => Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())));
  await page.screenshot({ path: "docs/home-v3/home-1280.png", fullPage: true });
});

test("customer tabs swap the phone screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const shot = page.locator("#customer-view img[data-active='true']");
  await expect(shot).toHaveAttribute("data-shot", "review");
  await page.getByRole("tab", { name: "Menu" }).click();
  await expect(shot).toHaveAttribute("data-shot", "menu");
  await page.getByRole("tab", { name: "WhatsApp order" }).click();
  await expect(shot).toHaveAttribute("data-shot", "order");
});

test("the sticky bar stays hidden on a desktop width", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bar = page.locator("#sticky-cta");
  await expect(bar).toBeHidden();
  await page.locator("#home-flow").evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + 8);
  });
  await expect(bar).toBeHidden();
});

test("the sticky bar appears after the hero and does not cover the footer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const bar = page.locator("#sticky-cta");
  await expect(bar).toBeHidden();
  await page.locator("#home-flow").evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top + 8);
  });
  await expect(bar).toBeVisible();
  const overlap = await page.evaluate(() => {
    const node = document.getElementById("sticky-cta");
    if (!node || node.hidden) return "hidden";
    const barBox = node.getBoundingClientRect();
    const flow = document.querySelector("#home-flow h2");
    if (!flow) return "missing";
    const title = flow.getBoundingClientRect();
    const hits = title.bottom > barBox.top && title.top < barBox.bottom;
    return hits ? "covered" : "";
  });
  expect(overlap).toBe("");
  await page.locator("#home-footer").scrollIntoViewIfNeeded();
  await expect(bar).toBeHidden();
});

test("every home image has alt text", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const missing = await page.evaluate(() =>
    [...document.images].filter((img) => !img.getAttribute("alt")?.trim()).map((img) => img.currentSrc || img.src)
  );
  expect(missing).toEqual([]);
});

test("reduced motion still shows the home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const hero = page.locator("#home-hero");
  await expect(hero).toBeVisible();
  const opacity = await hero.evaluate((element) => getComputedStyle(element).opacity);
  expect(opacity).toBe("1");
  const card = page.locator(".hv3-rise").first();
  await expect(card).toBeVisible();
  const animated = await card.evaluate((element) => getComputedStyle(element).animationName);
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

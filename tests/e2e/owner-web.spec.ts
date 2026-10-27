import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const legacyRedirects: Array<[string, string]> = [
  ["/dashboard/orders", "/dashboard/sell/orders"],
  ["/dashboard/customers", "/dashboard/sell/customers"],
  ["/dashboard/campaigns", "/dashboard/sell/campaigns"],
  ["/dashboard/reviews", "/dashboard/reputation/reviews"],
  ["/dashboard/feedback", "/dashboard/reputation/feedback"],
  ["/dashboard/ai", "/dashboard/reputation/ai-replies"],
  ["/dashboard/analytics", "/dashboard/insights"],
  ["/dashboard/billing", "/dashboard/account/plan"],
  ["/dashboard/refer", "/dashboard/account/refer"],
  ["/dashboard/settings", "/dashboard/account/settings"],
  ["/dashboard/help", "/dashboard/account/help"],
  ["/dashboard/onboarding", "/dashboard/account/settings"],
  ["/dashboard/qr-codes/old-code", "/dashboard/page/qr"],
  ["/dashboard/qr-codes", "/dashboard/page/qr"],
  ["/dashboard/activate", "/dashboard/page/qr"],
  ["/dashboard/print/paper", "/dashboard/page/print"],
  ["/dashboard/shop/orders/old-order", "/dashboard/page/print"],
  ["/dashboard/shop/orders", "/dashboard/page/print"],
  ["/dashboard/shop/cart", "/dashboard/page/print"],
  ["/dashboard/shop/commission", "/dashboard/account/refer"],
  ["/dashboard/shop/old-item", "/dashboard/page/print"],
  ["/dashboard/shop", "/dashboard/page/print"],
  ["/dashboard/businesses/sample-id/edit", "/dashboard/account/settings"],
  ["/dashboard/businesses/sample-id/locations", "/dashboard/account/settings"],
  ["/dashboard/businesses/sample-id/store", "/dashboard/account/settings"],
  ["/dashboard/businesses/sample-id/staff", "/dashboard/account/settings"],
  ["/dashboard/businesses/sample-id/menu", "/dashboard/sell/menu"],
  ["/dashboard/businesses/sample-id/offers", "/dashboard/sell/campaigns"],
  ["/dashboard/businesses/sample-id/qr", "/dashboard/page/qr"],
  ["/dashboard/businesses/sample-id/print", "/dashboard/page/print"],
  ["/dashboard/businesses/sample-id/tap", "/dashboard/page"],
  ["/dashboard/businesses/sample-id/theme", "/dashboard/page"],
  ["/dashboard/businesses/sample-id/testimonials", "/dashboard/page"],
  ["/dashboard/businesses/sample-id/review-templates", "/dashboard/reputation/reviews"],
  ["/dashboard/businesses/sample-id/ai", "/dashboard/reputation/ai-replies"],
  ["/dashboard/businesses/new", "/dashboard/account/settings"],
  ["/dashboard/businesses/sample-id", "/dashboard/page"],
  ["/dashboard/businesses", "/dashboard/account/settings"]
];

for (const [source, destination] of legacyRedirects) {
  test(`legacy dashboard URL ${source} redirects permanently`, async ({ request }) => {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(308);
    const location = response.headers().location;
    expect(location, source).toBeTruthy();
    expect(new URL(location!, "http://127.0.0.1").pathname, source).toBe(destination);
  });
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    const envFile = path.join(process.cwd(), file);
    if (!existsSync(envFile)) continue;
    const entry = readFileSync(envFile, "utf8").split(/\r?\n/).find((line) => /^\s*DATABASE_URL\s*=/.test(line));
    if (entry) return entry.slice(entry.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL must be set for owner web E2E fixtures");
}

async function captureScreens(page: import("@playwright/test").Page, routes: Array<[string, string]>, prefix: string) {
  const outputDir = path.join(process.cwd(), "docs", "owner-web", "screenshots");
  mkdirSync(outputDir, { recursive: true });
  for (const theme of ["light", "dark"] as const) {
    await page.goto("/dashboard");
    await page.evaluate((nextTheme) => window.localStorage.setItem("qr24x7-owner-theme", nextTheme), theme);
    await page.reload();
    for (const [label, route] of routes) {
      for (const width of [1440, 390] as const) {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("main")).toBeVisible();
        await page.screenshot({
          path: path.join(outputDir, `${prefix}-${label}-${theme}-${width}.png`),
          fullPage: true,
          animations: "disabled"
        });
      }
    }
  }
}

test("owner signs in, follows setup, filters lists, opens an order, sees plan lock, and captures dashboard screens", async ({ page }) => {
  test.setTimeout(900_000);
  const email = `owner-web-${Date.now()}@example.com`;
  const password = "OwnerWebTest1";
  const orderNumber = `OW${Date.now().toString().slice(-8)}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  let userId = "";
  let businessId = "";
  let subscriptionId = "";
  let planId = "";
  const reviewIds: string[] = [];
  let orderId = "";

  try {
    await page.goto("/register");
    await page.getByRole("button", { name: "Use email instead" }).click();
    await page.getByLabel("Your name").fill("Owner Web Test");
    await page.getByLabel("Business name").fill("Owner Web Studio");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/dashboard**");
    await expect(page.getByRole("main")).toBeVisible();

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    expect(user).toBeTruthy();
    userId = user!.id;
    const business = await prisma.business.findFirst({ where: { ownerId: userId, archived: false }, orderBy: { createdAt: "asc" }, select: { id: true } });
    expect(business).toBeTruthy();
    businessId = business!.id;

    const start = page.getByRole("link", { name: "Start" }).first();
    if (await start.isVisible().catch(() => false)) {
      const activeStep = await page.locator('[aria-expanded="true"]').first().innerText();
      const startHref = await start.getAttribute("href");
      expect(startHref).toBeTruthy();
      const expectedPath = activeStep.includes("Business details")
        ? "/dashboard/account/settings"
        : activeStep.includes("Page link") || activeStep.includes("Page buttons")
          ? "/dashboard/page"
          : activeStep.includes("Menu")
            ? "/dashboard/sell/menu"
            : activeStep.includes("Store hours")
              ? "/dashboard/account/settings"
              : "/dashboard/page/print";
      await Promise.all([
        page.waitForURL((url) => url.pathname === expectedPath),
        start.click()
      ]);
      expect(new URL(page.url()).pathname).toBe(expectedPath);
      await page.goto("/dashboard");
    }

    await prisma.menuItem.create({ data: { businessId, name: "Sample tea", pricePaise: 7500 } });
    const order = await prisma.menuOrder.create({ data: {
      businessId,
      number: orderNumber,
      customerName: "Asha Sample",
      customerPhone: "9876501234",
      consentAt: new Date(),
      orderType: "TAKEAWAY",
      payment: "CASH",
      totalPaise: 7500,
      subtotalPaise: 7500,
      items: [{ name: "Sample tea", qty: 1 }]
    } });
    orderId = order.id;
    for (const rating of [5, 3]) {
      const review = await prisma.review.create({ data: {
        businessId,
        rating,
        sentiment: rating >= 4 ? "POSITIVE" : "NEGATIVE",
        source: "e2e",
        customerName: rating === 5 ? "Asha Five Star" : "Ravi Three Star",
        customerPhone: rating === 5 ? "9876504321" : "9876504322",
        consentAt: new Date()
      } });
      reviewIds.push(review.id);
      if (rating === 3) await prisma.feedback.create({ data: { businessId, reviewId: review.id, message: "Please improve the waiting time." } });
    }

    await page.goto("/dashboard/sell/orders");
    await page.getByLabel("Search orders").fill(orderNumber);
    await page.getByRole("button", { name: "Search orders" }).click();
    await expect(page.getByText(orderNumber)).toBeVisible();
    await page.getByRole("button", { name: /Table/ }).click().catch(() => {});
    await page.getByRole("button", { name: new RegExp(orderNumber) }).first().click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText("Sample tea")).toBeVisible();
    await expect(drawer.getByText("Asha Sample")).toBeVisible();
    await drawer.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("link", { name: "New", exact: true }).click();
    await expect(page).toHaveURL(/status=NEW/);
    await expect(page.getByText(orderNumber)).toBeVisible();

    await page.goto("/dashboard/reputation/reviews");
    await page.getByRole("link", { name: "5★", exact: true }).click();
    await expect(page).toHaveURL(/rating=5/);
    await expect(page.getByText("Asha Five Star")).toBeVisible();
    await expect(page.getByText("Ravi Three Star")).toHaveCount(0);

    const plan = await prisma.plan.create({ data: {
      nameEn: "Owner Web Locked Test",
      nameHi: "लॉक टेस्ट",
      slug: `owner-web-locked-${Date.now()}`,
      modules: ["REVIEWS"],
      limits: {},
      active: true,
      visibleOnPricingPage: false,
      legacyTier: "GROWTH"
    } });
    planId = plan.id;
    const subscription = await prisma.subscription.create({ data: {
      userId,
      planId,
      modules: ["REVIEWS"],
      limits: {},
      tier: "GROWTH",
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 30 * 86400000),
      duration: "MONTH_1"
    } });
    subscriptionId = subscription.id;
    await page.goto(`/dashboard/sell/menu?businessId=${businessId}`);
    await expect(page.getByText("Included in higher plans")).toBeVisible();
    await expect(page.getByRole("link", { name: "View plans" })).toBeVisible();
    await prisma.subscription.delete({ where: { id: subscriptionId } });
    subscriptionId = "";
    await prisma.plan.delete({ where: { id: planId } });
    planId = "";

    const ownerScreens: Array<[string, string]> = [
      ["home", "/dashboard"],
      ["orders", "/dashboard/sell/orders"],
      ["menu-products", `/dashboard/sell/menu?businessId=${businessId}`],
      ["customers", "/dashboard/sell/customers"],
      ["offers-campaigns", `/dashboard/sell/campaigns?businessId=${businessId}`],
      ["reviews", "/dashboard/reputation/reviews"],
      ["feedback", "/dashboard/reputation/feedback"],
      ["ai-replies", "/dashboard/reputation/ai-replies"],
      ["my-page", `/dashboard/page?businessId=${businessId}`],
      ["page-buttons", `/dashboard/page?businessId=${businessId}&tab=buttons`],
      ["page-theme", `/dashboard/page?businessId=${businessId}&tab=theme`],
      ["page-testimonials", `/dashboard/page?businessId=${businessId}&tab=testimonials`],
      ["page-link", `/dashboard/page?businessId=${businessId}&tab=link`],
      ["qr-codes", `/dashboard/page/qr?businessId=${businessId}`],
      ["qr-create", `/dashboard/page/qr?businessId=${businessId}&tab=create`],
      ["nfc-activate", `/dashboard/page/qr?businessId=${businessId}&tab=activate`],
      ["print-qr", `/dashboard/page/print?businessId=${businessId}`],
      ["print-sheets", "/dashboard/page/print?tab=paper"],
      ["order-stands", "/dashboard/page/print?tab=shop"],
      ["hardware-orders", "/dashboard/page/print?tab=orders"],
      ["analytics", "/dashboard/insights"],
      ["plan-billing", "/dashboard/account/plan"],
      ["refer-earn", "/dashboard/account/refer"],
      ["hardware-rewards", "/dashboard/account/refer?tab=hardware"],
      ["settings", "/dashboard/account/settings"],
      ["business-details", `/dashboard/account/settings?section=business-details&businessId=${businessId}`],
      ["store-hours-upi", `/dashboard/account/settings?section=store&businessId=${businessId}`],
      ["team-staff", `/dashboard/account/settings?section=staff&businessId=${businessId}`],
      ["locations", `/dashboard/account/settings?section=locations&businessId=${businessId}`],
      ["help", "/dashboard/account/help"],
      ["notifications", "/dashboard/notifications"]
    ];
    await captureScreens(page, ownerScreens, "owner");

    const agentCode = `OW${Date.now().toString(36).toUpperCase()}`;
    await prisma.agentProfile.create({ data: { userId, code: agentCode } });
    await prisma.user.update({ where: { id: userId }, data: { role: "AGENT" } });
    await page.getByRole("button", { name: "Account menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/dashboard**");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.getByRole("link", { name: "Agent home" })).toBeVisible();
    const agentScreens: Array<[string, string]> = [
      ["home", "/dashboard/agent"],
      ["businesses", "/dashboard/agent/businesses"],
      ["team", "/dashboard/agent/team"],
      ["earnings", "/dashboard/agent/earnings"],
      ["payouts", "/dashboard/agent/payouts"],
      ["profile", "/dashboard/agent/profile"],
      ["how-earnings-work", "/dashboard/agent/how"]
    ];
    await captureScreens(page, agentScreens, "agent");
  } finally {
    if (subscriptionId) await prisma.subscription.delete({ where: { id: subscriptionId } }).catch(() => undefined);
    if (planId) await prisma.plan.delete({ where: { id: planId } }).catch(() => undefined);
    if (orderId) await prisma.menuOrder.delete({ where: { id: orderId } }).catch(() => undefined);
    if (reviewIds.length) await prisma.review.deleteMany({ where: { id: { in: reviewIds } } }).catch(() => undefined);
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  }
});

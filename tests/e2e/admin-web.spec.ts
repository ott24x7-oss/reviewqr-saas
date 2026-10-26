import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(path.join(process.cwd(), file), "utf8");
      for (const row of text.split(/\r?\n/)) {
        if (!row.startsWith("DATABASE_URL=")) continue;
        let value = row.slice("DATABASE_URL=".length).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
        if (value) return value;
      }
    } catch {
      /* The next file may hold the URL. */
    }
  }
  throw new Error("DATABASE_URL is missing");
}

async function signInWithEmail(page: Page, email: string, password: string) {
  if (!page.url().includes("/login")) await page.goto("/login", { timeout: 120_000 });
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard**", { timeout: 120_000 });
}

async function registerWithEmail(page: Page, input: { name: string; business: string; email: string; password: string }) {
  await page.goto("/register", { timeout: 120_000 });
  await page.getByRole("button", { name: "Use email instead" }).click();
  await page.getByLabel("Your name").fill(input.name);
  await page.getByLabel("Business name").fill(input.business);
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Password").fill(input.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/(dashboard|login)(?:\?|$)/, { timeout: 120_000 });
  if (page.url().includes("/login")) await signInWithEmail(page, input.email, input.password);
}

async function shoot(page: Page, name: string) {
  for (const theme of ["light", "dark"] as const) {
    await page.evaluate((value) => localStorage.setItem("qr24-admin-theme", value), theme);
    await page.reload({ timeout: 120_000 });
    await expect(page.getByRole("button", { name: theme === "dark" ? "Use light theme" : "Use dark theme" })).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(900);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.screenshot({ path: path.join("docs", "admin-web", `${name}-${theme}-${width}.png`) });
    }
  }
}

test("admin web search, inbox, payout step-up, export, and redirects", async ({ page }) => {
  test.setTimeout(600_000);
  const stamp = Date.now();
  const email = `admin-web-${stamp}@example.com`;
  const password = "AdminWeb1a";
  const customerName = `Findme ${stamp}`;
  const agentName = `Queue ${stamp}`;
  const code = `w${String(stamp).slice(-8)}`;
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl() } } });
  const extraUsers: string[] = [];
  let paymentId = "";
  let shopOrderId = "";
  let articleId = "";
  let supportTicketId = "";
  let pricingCopyBefore: { value: string; updatedBy: string | null } | null | undefined;

  try {
    await registerWithEmail(page, { name: "Web Admin", business: `Web Cafe ${stamp}`, email, password });
    const admin = await prisma.user.update({ where: { email }, data: { role: "ADMIN", phone: `8${String(stamp).slice(-9)}` } });
    const supportTicket = await prisma.supportTicket.create({ data: {
      userId: admin.id,
      subject: `Sample setup question ${stamp}`,
      messages: { create: { authorId: admin.id, body: "How do I update the store hours?" } }
    } });
    supportTicketId = supportTicket.id;
    const business = await prisma.business.findFirst({ where: { ownerId: admin.id }, select: { id: true } });
    const customer = await prisma.user.create({ data: { email: `find-${stamp}@example.com`, name: customerName, phone: "9111122222", role: "USER" } });
    extraUsers.push(customer.id);
    const agentUser = await prisma.user.create({ data: { email: `queue-${stamp}@example.com`, name: agentName, role: "AGENT" } });
    extraUsers.push(agentUser.id);
    const profile = await prisma.agentProfile.create({ data: { userId: agentUser.id, code, status: "PENDING" } });
    const commission = await prisma.shopCommission.create({
      data: { agentId: agentUser.id, kind: "SALE", sourceId: `web-${stamp}`, amountPaise: 2500, percent: 10, status: "APPROVED" }
    });
    const payment = await prisma.payment.create({ data: { userId: admin.id, amount: 10000, tier: "STARTER", status: "PENDING" } });
    paymentId = payment.id;
    const shopOrder = await prisma.shopOrder.create({ data: {
      userId: admin.id, status: "PAID", paymentStatus: "PAID", invoiceNumber: `AW-${stamp}`,
      subtotalPaise: 1000, discountPaise: 0, totalPaise: 1000, taxablePaise: 1000, cgstPaise: 0,
      sgstPaise: 0, igstPaise: 0, advancePaise: 0, balancePaise: 1000,
      lines: { create: { sku: `AW-${stamp}`, name: "Test acrylic QR", qty: 1, unitPaise: 1000, hsn: "", gstPercent: 0, discountPaise: 0, netPaise: 1000, taxablePaise: 1000, cgstPaise: 0, sgstPaise: 0, igstPaise: 0, ships: false, needsDesign: false, needsNfc: false, weightGrams: 0 } }
    } });
    shopOrderId = shopOrder.id;
    const plan = await prisma.plan.findFirst({ select: { id: true } });

    await page.context().clearCookies();
    await signInWithEmail(page, email, password);

    const pairingWithoutStepUp = await page.request.post("/api/admin/whatsapp/baileys/connect");
    expect(pairingWithoutStepUp.status()).toBe(403);
    expect(await pairingWithoutStepUp.json()).toMatchObject({ stepUp: "whatsapp_pairing" });
    await page.goto("/admin/whatsapp", { timeout: 120_000 });
    await page.getByRole("button", { name: /Start & show QR|Reconnect/ }).click();
    await expect(page.getByRole("dialog", { name: "Confirm WhatsApp pairing" })).toBeVisible();
    await expect(page.getByLabel("WhatsApp code")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.goto(`/admin/orders?view=board&status=PAID&q=${shopOrderId}`, { timeout: 120_000 });
    await page.getByRole("button", { name: "Move to Cancelled" }).click();
    await expect.poll(async () => prisma.shopOrder.findUnique({ where: { id: shopOrderId }, select: { status: true } })).toMatchObject({ status: "CANCELLED" });
    await expect.poll(async () => prisma.auditLog.count({ where: { action: "shop.order.move", entityId: shopOrderId, userId: admin.id, metadata: { path: ["from"], equals: "PAID" } } })).toBeGreaterThan(0);

    await page.goto("/admin/help", { timeout: 120_000 });
    const articleTitle = `How to track ${stamp}`;
    await page.getByLabel("Article title").fill(articleTitle);
    await page.getByPlaceholder("Slug").fill(`track-${stamp}`);
    await page.getByLabel("Article body").fill("Open orders to follow the shipment.");
    await page.getByRole("button", { name: "Create article" }).click();
    const articleRow = page.locator("li").filter({ hasText: articleTitle });
    await expect(articleRow).toBeVisible();
    await articleRow.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Article title").fill(`${articleTitle} updated`);
    await page.getByRole("button", { name: "Save article" }).click();
    await expect(page.getByText(`${articleTitle} updated`)).toBeVisible();
    const helpArticle = await prisma.helpArticle.findFirst({ where: { slug: `track-${stamp}` }, select: { id: true } });
    articleId = helpArticle?.id || "";

    await page.goto("/admin", { timeout: 120_000 });
    await page.getByRole("button", { name: /Search/ }).click();
    await page.getByPlaceholder("Search pages, customers, businesses, payments, agents, orders").fill(customerName);
    await expect(page.getByText(customerName).last()).toBeVisible({ timeout: 30_000 });
    await page.getByText(customerName).last().click();
    await expect(page).toHaveURL(new RegExp(`/admin/customers/${customer.id}`), { timeout: 30_000 });

    await page.goto("/admin/inbox?segment=agents", { timeout: 120_000 });
    const agentRow = page.getByRole("row", { name: new RegExp(agentName) });
    await agentRow.getByRole("button", { name: "Approve" }).click();
    await page.locator("#admin-reason").fill("Checked the application");
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect.poll(async () => {
      return prisma.auditLog.count({ where: { action: "inbox.action", userId: admin.id, reason: "Checked the application" } });
    }, { timeout: 30_000 }).toBeGreaterThan(0);
    const approved = await prisma.agentProfile.findUnique({ where: { id: profile.id }, select: { status: true } });
    expect(approved?.status).toBe("ACTIVE");

    await page.goto(`/admin/commissions?q=${code}`, { timeout: 120_000 });
    const payRow = page.getByRole("row", { name: new RegExp(agentName) });
    await payRow.getByRole("button", { name: "Mark paid" }).click();
    await payRow.getByLabel("UTR").fill("UTR123456");
    await payRow.getByLabel("Note").fill("Paid outside the app");
    await payRow.getByLabel("Reason").fill("Monthly payout");
    await payRow.getByRole("button", { name: "Record payout" }).click();
    await expect(payRow.getByRole("alert")).toContainText("WhatsApp code", { timeout: 30_000 });
    const still = await prisma.shopCommission.findUnique({ where: { id: commission.id }, select: { status: true } });
    expect(still?.status).toBe("APPROVED");

    await page.goto(`/admin/customers?q=${encodeURIComponent(customer.email!)}`, { timeout: 120_000 });
    await expect(page.getByText(customer.email!)).toBeVisible({ timeout: 30_000 });
    const href = await page.getByRole("link", { name: "Export" }).getAttribute("href");
    expect(href).toContain("entity=customers");
    const csv = await page.request.get(href || "", { timeout: 120_000 });
    expect(csv.status()).toBe(200);
    const body = await csv.text();
    expect(body).toContain(customer.email);
    expect(body).not.toContain("9111122222");
    expect(body).toContain("2222");
    await expect.poll(async () => prisma.auditLog.count({ where: { action: "admin.export", userId: admin.id } })).toBeGreaterThan(0);

    const redirects: Array<[string, RegExp]> = [
      ["/admin/users", /\/admin\/customers$/],
      [`/admin/users/${customer.id}`, new RegExp(`/admin/customers/${customer.id}`)],
      ["/admin/pricing", /\/admin\/plans\?tab=copy/],
      ["/admin/app", /\/admin\/apps$/],
      ["/admin/production", /\/admin\/orders$/],
      ["/admin/production/nfc", /\/admin\/orders\?tab=nfc$/],
      ["/admin/shop", /\/admin\/catalogue$/],
      ["/admin/shop/reports", /\/admin\/orders\?tab=reports$/],
      ["/admin/shipping", /\/admin\/orders\?tab=shipping$/],
      ["/admin/qr", /\/admin\/tools\?tab=qr$/],
      ["/admin/print", /\/admin\/tools\?tab=print$/],
      ["/admin/nfc", /\/admin\/tools\?tab=nfc$/],
      ["/admin/branding", /\/admin\/site\?tab=branding$/],
      ["/admin/presets", /\/admin\/themes\?tab=presets$/]
    ];
    for (const [from, to] of redirects) {
      await page.goto(from, { timeout: 120_000 });
      await expect(page).toHaveURL(to, { timeout: 30_000 });
      if (from === "/admin/app") await expect(page.getByRole("heading", { name: "Admin devices" })).toBeVisible();
    }

    pricingCopyBefore = await prisma.appSetting.findUnique({ where: { key: "pricing.copy" }, select: { value: true, updatedBy: true } });
    await page.goto("/admin/plans?tab=copy", { timeout: 120_000 });
    await expect(page.getByRole("heading", { name: "Pricing page copy" })).toBeVisible({ timeout: 30_000 });
    const faqQuestion = `Edited question ${stamp}`;
    const stickerRow = `Edited row ${stamp}`;
    await page.locator("#qEn-0").fill(faqQuestion);
    await page.locator("#rowEn-0").fill(stickerRow);
    await page.getByRole("button", { name: "Save pricing page" }).click();
    await expect.poll(async () => {
      const row = await prisma.appSetting.findUnique({ where: { key: "pricing.copy" }, select: { value: true } });
      return row?.value || "";
    }, { timeout: 30_000 }).toContain(faqQuestion);
    const savedCopy = await prisma.appSetting.findUnique({ where: { key: "pricing.copy" }, select: { value: true } });
    expect(savedCopy?.value).toContain(stickerRow);
    await page.reload({ timeout: 120_000 });
    await expect(page.locator("#qEn-0")).toHaveValue(faqQuestion);
    await expect(page.locator("#rowEn-0")).toHaveValue(stickerRow);
    await expect.poll(async () => prisma.auditLog.count({ where: { action: "pricing.update", userId: admin.id } })).toBeGreaterThan(0);

    await page.goto("/admin?range=qtd", { timeout: 120_000 });
    const compareSwitch = page.getByRole("switch", { name: "Compare to previous" });
    await expect(compareSwitch).toHaveAttribute("aria-checked", "true");
    const trackBox = await compareSwitch.locator("span").first().boundingBox();
    const labelBox = await compareSwitch.getByText("Compare to previous", { exact: true }).boundingBox();
    expect(trackBox && labelBox && trackBox.x + trackBox.width <= labelBox.x).toBeTruthy();
    await compareSwitch.click();
    await expect(page).toHaveURL(/compare=0/);
    await expect(page.getByText("Daily paid amount", { exact: false })).toBeVisible();
    await expect(page.getByText("dotted line is the previous period")).toHaveCount(0);
    await compareSwitch.click();
    await expect(page).not.toHaveURL(/compare=0/);
    await expect(page.getByText("dotted line is the previous period")).toBeVisible();
    await page.getByRole("button", { name: "Custom range" }).click();
    const rangeDialog = page.getByRole("dialog", { name: "Choose custom date range" });
    await expect(rangeDialog.locator("h3")).toHaveCount(2);
    await rangeDialog.getByRole("button", { name: "Cancel" }).click();

    const shots: Array<[string, string]> = [
      ["/admin", "home"],
      ["/admin/inbox", "inbox"],
      ["/admin/customers", "customers"],
      [`/admin/customers/${customer.id}`, "customer"],
      ["/admin/businesses", "businesses"],
      ["/admin/payments", "payments"],
      [`/admin/payments/${payment.id}`, "payment"],
      ["/admin/subscriptions", "subscriptions"],
      ["/admin/plans", "plans"],
      ["/admin/plans?tab=copy", "plans-copy"],
      ["/admin/referrals", "referrals"],
      ["/admin/agents", "agents"],
      [`/admin/agents/${profile.id}`, "agent"],
      ["/admin/commissions", "commissions"],
      ["/admin/audit", "audit"],
      ["/admin/settings", "settings"],
      ["/admin/apps", "apps"],
      ["/admin/_kit", "kit"],
      ["/admin/orders?view=board", "orders-board"],
      ["/admin/orders?view=table", "orders"],
      [`/admin/orders/${shopOrderId}`, "order-detail"],
      ["/admin/catalogue", "catalogue"],
      ["/admin/tools?tab=qr", "tools-qr"],
      ["/admin/tools?tab=print", "tools-print"],
      ["/admin/tools?tab=nfc", "tools-nfc"],
      ["/admin/whatsapp", "whatsapp"],
      ["/admin/email", "email"],
      ["/admin/ai", "ai"],
      ["/admin/site", "site"],
      ["/admin/site?tab=branding", "site-branding"],
      ["/admin/themes", "themes"],
      ["/admin/themes?tab=presets", "theme-presets"],
      ["/admin/help", "help"],
      ["/admin/support", "support"],
      [`/admin/support/${supportTicketId}`, "support-ticket"]
    ];
    if (business) shots.splice(5, 0, [`/admin/businesses/${business.id}`, "business"]);
    if (plan) shots.splice(10, 0, [`/admin/plans/${plan.id}`, "plan"]);
    for (const [url, name] of shots) {
      await page.goto(url, { timeout: 120_000 });
      await shoot(page, name);
    }
  } finally {
    if (pricingCopyBefore) {
      await prisma.appSetting.update({ where: { key: "pricing.copy" }, data: pricingCopyBefore });
    } else if (pricingCopyBefore === null) {
      await prisma.appSetting.deleteMany({ where: { key: "pricing.copy" } });
    }
    if (supportTicketId) await prisma.supportTicket.deleteMany({ where: { id: supportTicketId } });
    if (articleId) await prisma.helpArticle.deleteMany({ where: { id: articleId } });
    if (shopOrderId) await prisma.shopOrder.deleteMany({ where: { id: shopOrderId } });
    if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
    await prisma.shopCommission.deleteMany({ where: { agentId: { in: extraUsers } } });
    const admin = await prisma.user.findUnique({ where: { email }, select: { id: true, phone: true } });
    const ids = [...extraUsers, ...(admin ? [admin.id] : [])];
    await prisma.auditLog.deleteMany({ where: { OR: [{ userId: { in: ids } }, { entityId: { in: ids } }] } });
    if (admin?.phone) await prisma.emailOtp.deleteMany({ where: { identifier: admin.id } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});

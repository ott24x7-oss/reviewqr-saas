import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionUser = vi.hoisted(() => ({ id: "" }));

vi.mock("@/lib/auth", () => ({
  requireUser: async () => {
    if (!sessionUser.id) throw new Error("UNAUTHORIZED");
    return { id: sessionUser.id };
  }
}));

vi.mock("next/cache", () => ({
  revalidateTag: () => undefined,
  revalidatePath: () => undefined,
  unstable_cache: (fn: unknown) => fn
}));

import {
  applyBookingStatus,
  bookingWhatsAppText,
  formatDuration,
  formatServicePrice
} from "@reviewqr/shared";
import { POST as publicBook } from "../../app/api/public/bookings/route";
import { GET as webList } from "../../app/api/bookings/route";
import { GET as webDetail } from "../../app/api/bookings/[id]/route";
import { POST as webStatus } from "../../app/api/bookings/[id]/status/route";
import { GET as v1List } from "../../app/api/v1/bookings/route";
import { GET as v1Detail } from "../../app/api/v1/bookings/[id]/route";
import { POST as v1Status } from "../../app/api/v1/bookings/[id]/status/route";
import { GET as dashboardGet } from "../../app/api/v1/dashboard/route";
import { bookingAnalytics } from "../../lib/analytics/bookings";
import { istDayKey } from "../../lib/analytics/ist";
import { issueTokenPair } from "../../lib/auth/sessions";
import { runClaimedJob } from "../../lib/jobs/dispatch";
import { prisma } from "../../lib/db";
import { runMenuAction } from "../../lib/store/menu-action";
import { publicCatalogue } from "../../lib/store/public-catalogue";
import { publicServicesView } from "../../lib/tap/services-gate";
import { backfillServiceKinds } from "../../lib/store/service-backfill";

const userIds: string[] = [];
const businessIds: string[] = [];
const planIds: string[] = [];
const bookingIds: string[] = [];
const ips: string[] = [];

describe("service booking", () => {
  afterAll(async () => {
    if (bookingIds.length) {
      await prisma.job.deleteMany({
        where: { idempotencyKey: { in: bookingIds.map((id) => `notify.booking:${id}`) } }
      });
    }
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: "booking:" } } });
    if (userIds.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
    }
    if (businessIds.length) {
      await prisma.qRCode.deleteMany({ where: { businessId: { in: businessIds } } });
      await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    }
    if (userIds.length) await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("formats duration, price, and the WhatsApp sentence", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 hr");
    expect(formatDuration(75)).toBe("1 hr, 15 min");
    expect(formatDuration(45, "hi")).toBe("45 मिनट");
    expect(formatDuration(60, "hi")).toBe("1 घंटा");
    expect(formatDuration(120, "hi")).toBe("2 घंटे");
    expect(formatServicePrice({ pricePaise: 30000 })).toBe("₹300");
    expect(formatServicePrice({ pricePaise: 30000, priceType: "FROM" })).toBe("from ₹300");
    expect(formatServicePrice({ pricePaise: 30000, priceType: "FROM", lang: "hi" })).toBe("₹300 से");
    expect(formatServicePrice({ pricePaise: 0, priceType: "ON_REQUEST" })).toBe("Price on request");
    expect(formatServicePrice({ pricePaise: 0, priceType: "ON_REQUEST", lang: "hi" })).toBe("कीमत पूछें");
    expect(
      bookingWhatsAppText({
        businessName: "Glow Studio",
        serviceName: "Haircut",
        optionLabel: "Senior",
        dateLabel: "Today",
        timeLabel: "Morning",
        customerName: "Asha"
      })
    ).toBe("Hi Glow Studio, I'd like to book Haircut (Senior) – Today, Morning. Name: Asha.");
    expect(
      bookingWhatsAppText({
        businessName: "Glow Studio",
        serviceName: "हेयरकट",
        dateLabel: "आज",
        timeLabel: "सुबह",
        customerName: "Asha",
        lang: "hi"
      })
    ).toBe("नमस्ते Glow Studio, मैं हेयरकट बुक करना चाहता हूँ – आज, सुबह. नाम: Asha.");
    expect(applyBookingStatus("NEW", "DONE")).toBe("DONE");
    expect(applyBookingStatus("CONFIRMED", "NO_SHOW")).toBe("NO_SHOW");
    expect(applyBookingStatus("NEW", "LATER")).toBeNull();
  });

  it("backfills a duration row to SERVICE and leaves products alone", async () => {
    const stamp = Date.now().toString(36);
    const owner = await prisma.user.create({ data: { email: `svc-back-${stamp}@example.test`, role: "USER" } });
    userIds.push(owner.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Backfill", slug: `svc-back-${stamp}` }
    });
    businessIds.push(business.id);
    const timed = await prisma.menuItem.create({
      data: { businessId: business.id, name: "Cut", pricePaise: 20000, durationMinutes: 30 }
    });
    const product = await prisma.menuItem.create({
      data: { businessId: business.id, name: "Oil", pricePaise: 10000 }
    });
    expect(timed.kind).toBe("PRODUCT");
    await backfillServiceKinds();
    await backfillServiceKinds();
    const again = await prisma.menuItem.findUnique({ where: { id: timed.id } });
    const still = await prisma.menuItem.findUnique({ where: { id: product.id } });
    expect(again?.kind).toBe("SERVICE");
    expect(still?.kind).toBe("PRODUCT");
  });

  it("saves service fields through the menu action and the salon template", async () => {
    const stamp = Date.now().toString(36);
    const owner = await prisma.user.create({ data: { email: `svc-menu-${stamp}@example.test`, role: "USER" } });
    userIds.push(owner.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Menu", slug: `svc-menu-${stamp}` }
    });
    businessIds.push(business.id);

    const created = await runMenuAction(owner.id, business.id, {
      action: "item",
      name: "Beard",
      priceRupees: 150,
      durationMinutes: 20,
      priceType: "FROM",
      bookable: false
    });
    expect(created.ok).toBe(true);
    const beard = await prisma.menuItem.findFirst({ where: { businessId: business.id, name: "Beard" } });
    expect(beard?.kind).toBe("SERVICE");
    expect(beard?.priceType).toBe("FROM");
    expect(beard?.bookable).toBe(false);

    const explicit = await runMenuAction(owner.id, business.id, {
      action: "item",
      name: "Retail kit",
      priceRupees: 100,
      durationMinutes: 30,
      itemKind: "PRODUCT"
    });
    expect(explicit.ok).toBe(true);
    const kit = await prisma.menuItem.findFirst({ where: { businessId: business.id, name: "Retail kit" } });
    expect(kit?.kind).toBe("PRODUCT");

    const imported = await runMenuAction(owner.id, business.id, {
      action: "items",
      items: [{ name: "Consult", priceRupees: 300, durationMinutes: 15 }]
    });
    expect(imported.ok).toBe(true);
    const consult = await prisma.menuItem.findFirst({ where: { businessId: business.id, name: "Consult" } });
    expect(consult?.kind).toBe("SERVICE");

    const copied = await runMenuAction(owner.id, business.id, { action: "duplicate", id: beard!.id, kind: "item" });
    expect(copied.ok).toBe(true);
    const copies = await prisma.menuItem.findMany({ where: { businessId: business.id, name: "Beard" } });
    expect(copies.every((row) => row.kind === "SERVICE" && row.priceType === "FROM" && row.bookable === false)).toBe(true);

    const option = await runMenuAction(owner.id, business.id, {
      action: "variant",
      id: consult!.id,
      name: "Home",
      priceRupees: 500,
      durationMinutes: 45
    });
    expect(option.ok).toBe(true);
    const variant = await prisma.menuVariant.findFirst({ where: { itemId: consult!.id, label: "Home" } });
    expect(variant?.durationMinutes).toBe(45);

    const templated = await runMenuAction(owner.id, business.id, { action: "template", templateId: "salon" });
    expect(templated.ok).toBe(true);
    const colour = await prisma.menuItem.findFirst({ where: { businessId: business.id, name: "Hair colour" } });
    expect(colour?.kind).toBe("SERVICE");
    expect(colour?.priceType).toBe("FROM");
    expect(colour?.bookable).toBe(true);
    const mode = await prisma.business.findUnique({ where: { id: business.id } });
    expect(mode?.catalogMode).toBe("SERVICES");
  });

  it("saves a consented booking, opens WhatsApp, and lets the owner update it", async () => {
    const stamp = Date.now().toString(36);
    const ip = `198.51.100.${stamp.length % 200}`;
    ips.push(ip);
    const owner = await prisma.user.create({
      data: { email: `svc-book-${stamp}@example.test`, role: "USER", subscriptionTier: "STARTER" }
    });
    const staff = await prisma.user.create({ data: { email: `svc-staff-${stamp}@example.test`, role: "USER" } });
    userIds.push(owner.id, staff.id);
    const business = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Glow Studio",
        slug: `svc-book-${stamp}`,
        whatsappNumber: "9876543210"
      }
    });
    businessIds.push(business.id);
    await prisma.businessMember.create({ data: { businessId: business.id, userId: staff.id, role: "STAFF" } });
    const code = `SV${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: business.id, label: "Desk", shortCode: code } });
    const item = await prisma.menuItem.create({
      data: {
        businessId: business.id,
        name: "Haircut",
        nameHi: "हेयरकट",
        pricePaise: 30000,
        durationMinutes: 30,
        kind: "SERVICE",
        bookable: true
      }
    });
    const variant = await prisma.menuVariant.create({
      data: { itemId: item.id, businessId: business.id, label: "Senior", labelHi: "सीनियर", pricePaise: 40000, inStock: true }
    });
    const today = istDayKey(new Date());
    const res = await publicBook(bookReq(ip, { code, itemId: item.id, variantId: variant.id, preferredDate: today }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeTruthy();
    bookingIds.push(body.id);
    const text = new URL(body.whatsappUrl).searchParams.get("text");
    expect(text).toBe("Hi Glow Studio, I'd like to book Haircut (Senior) – Today, Morning. Name: Asha.");
    const row = await prisma.bookingRequest.findUnique({ where: { id: body.id } });
    expect(row?.customerPhone).toBe("919876543210");
    expect(row?.consentAt).toBeTruthy();
    expect(row?.source).toBe("qr");
    expect(row?.status).toBe("NEW");
    const contact = await prisma.contact.findFirst({ where: { businessId: business.id, phone: "919876543210" } });
    expect(contact?.source).toBe("booking");

    const job = await prisma.job.findUnique({ where: { idempotencyKey: `notify.booking:${body.id}` } });
    expect(job?.type).toBe("notify.booking");
    if (job && job.status === "PENDING") await runClaimedJob(job.id);
    const done = await prisma.job.findUnique({ where: { idempotencyKey: `notify.booking:${body.id}` } });
    expect(done?.status).toBe("DONE");
    const note = await prisma.notification.findFirst({
      where: { userId: owner.id, type: "booking_request" },
      orderBy: { createdAt: "desc" }
    });
    expect(note?.link).toBe("/dashboard/sell/bookings");
    expect(JSON.stringify(note?.metadata)).toContain(body.id);

    const pair = await issueTokenPair(owner, { deviceName: "services" });
    const staffPair = await issueTokenPair(staff, { deviceName: "services-staff" });
    const listed = await v1List(bearer(`/api/v1/bookings?businessId=${business.id}`, pair.accessToken));
    expect(listed.status).toBe(200);
    const listBody = await listed.json();
    expect(listBody.data.items[0].id).toBe(body.id);
    expect(listBody.data.items[0].phone).toBe("919876543210");
    expect(listBody.data.items[0].canManage).toBe(true);

    const detail = await v1Detail(bearer(`/api/v1/bookings/${body.id}`, pair.accessToken), { params: { id: body.id } });
    expect(detail.status).toBe(200);
    const detailBody = await detail.json();
    expect(detailBody.data.callUrl).toBe("tel:+919876543210");
    expect(detailBody.data.whatsAppUrl).toContain("wa.me/919876543210");

    const staffList = await v1List(bearer(`/api/v1/bookings?businessId=${business.id}`, staffPair.accessToken));
    expect(staffList.status).toBe(200);
    const staffBody = await staffList.json();
    expect(staffBody.data.items[0].canManage).toBe(false);
    const staffChange = await v1Status(
      bearer(`/api/v1/bookings/${body.id}/status`, staffPair.accessToken, "POST", { status: "CONFIRMED" }),
      { params: { id: body.id } }
    );
    expect(staffChange.status).toBe(404);

    const changed = await v1Status(
      bearer(`/api/v1/bookings/${body.id}/status`, pair.accessToken, "POST", { status: "CONFIRMED" }),
      { params: { id: body.id } }
    );
    expect(changed.status).toBe(200);
    expect((await changed.json()).data.status).toBe("CONFIRMED");

    sessionUser.id = owner.id;
    const web = await webList(new NextRequest(`http://127.0.0.1/api/bookings?businessId=${business.id}&status=CONFIRMED`));
    expect(web.status).toBe(200);
    expect((await web.json()).items[0].id).toBe(body.id);
    const webOne = await webDetail(new NextRequest(`http://127.0.0.1/api/bookings/${body.id}`), { params: { id: body.id } });
    expect(webOne.status).toBe(200);
    sessionUser.id = staff.id;
    const webStaff = await webStatus(
      new NextRequest(`http://127.0.0.1/api/bookings/${body.id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "DONE" })
      }),
      { params: { id: body.id } }
    );
    expect(webStaff.status).toBe(404);
    sessionUser.id = "";
    const anon = await webList(new NextRequest("http://127.0.0.1/api/bookings"));
    expect(anon.status).toBe(401);

    const home = await dashboardGet(bearer(`/api/v1/dashboard?businessId=${business.id}`, pair.accessToken));
    expect(home.status).toBe(200);
    const homeBody = await home.json();
    expect(homeBody.data.bookingsToday).toBe(1);
    expect(homeBody.data.todayBookings[0].serviceName).toBe("Haircut");

    await prisma.menuItemView.create({
      data: { businessId: business.id, itemId: item.id, visitorHash: "a".repeat(16) }
    });
    await prisma.menuItemView.create({
      data: { businessId: business.id, itemId: item.id, visitorHash: "b".repeat(16) }
    });
    const todayKey = istDayKey(new Date());
    const analytics = await bookingAnalytics(business.id, todayKey, todayKey);
    expect(analytics.count).toBe(1);
    expect(analytics.byService[0]).toMatchObject({ itemId: item.id, name: "Haircut", count: 1 });
    expect(analytics.conversion).toBe(50);
  }, 20000);

  it("ignores bots, refuses a missing consent, and rate-limits the phone", async () => {
    const stamp = Date.now().toString(36);
    const ip = `203.0.113.${(stamp.length % 200) + 1}`;
    ips.push(ip);
    const owner = await prisma.user.create({ data: { email: `svc-guard-${stamp}@example.test`, role: "USER" } });
    userIds.push(owner.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Guard", slug: `svc-guard-${stamp}`, whatsappNumber: "9876543210" }
    });
    businessIds.push(business.id);
    const code = `SG${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: business.id, label: "Desk", shortCode: code } });
    const item = await prisma.menuItem.create({
      data: { businessId: business.id, name: "Facial", pricePaise: 80000, kind: "SERVICE", durationMinutes: 45 }
    });
    const today = istDayKey(new Date());
    const bot = await publicBook(
      bookReq(ip, { code, itemId: item.id, preferredDate: today, customerPhone: "9000000001" }, "Googlebot/2.1")
    );
    expect(bot.status).toBe(200);
    expect(await bot.json()).toEqual({ ok: true, ignored: true });
    expect(await prisma.bookingRequest.count({ where: { businessId: business.id } })).toBe(0);

    const refused = await publicBook(
      bookReq(ip, { code, itemId: item.id, preferredDate: today, customerPhone: "12", consent: true })
    );
    expect(refused.status).toBe(400);
    expect(await prisma.bookingRequest.count({ where: { businessId: business.id } })).toBe(0);

    const missing = await publicBook(
      new NextRequest("http://127.0.0.1/api/public/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip, "user-agent": "Mozilla/5.0" },
        body: JSON.stringify({
          code,
          itemId: item.id,
          customerName: "Asha",
          customerPhone: "9000000002",
          preferredDate: today,
          preferredSlot: "MORNING"
        })
      })
    );
    expect(missing.status).toBe(400);

    const burstIp = `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
    const burstPhone = `9${String(Date.now()).slice(-9)}`;
    ips.push(burstIp);
    for (let n = 0; n < 8; n += 1) {
      const saved = await publicBook(
        bookReq(burstIp, {
          code,
          itemId: item.id,
          preferredDate: today,
          customerPhone: burstPhone,
          customerName: `Guest ${n}`
        })
      );
      expect(saved.status, `attempt ${n}`).toBe(200);
      bookingIds.push((await saved.json()).id);
    }
    const limited = await publicBook(
      bookReq(burstIp, { code, itemId: item.id, preferredDate: today, customerPhone: "9000000004" })
    );
    expect(limited.status).toBe(429);
  }, 20000);

  it("rate-limits one business even when every request uses a new IP and phone", async () => {
    const stamp = Date.now().toString(36);
    const owner = await prisma.user.create({ data: { email: `svc-biz-${stamp}@example.test`, role: "USER" } });
    userIds.push(owner.id);
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Busy", slug: `svc-biz-${stamp}`, whatsappNumber: "9876543210" }
    });
    businessIds.push(business.id);
    const code = `SB${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: business.id, label: "Desk", shortCode: code } });
    const item = await prisma.menuItem.create({
      data: { businessId: business.id, name: "Trim", pricePaise: 20000, kind: "SERVICE", durationMinutes: 20 }
    });
    const today = istDayKey(new Date());
    for (let n = 1; n <= 20; n += 1) {
      const ip = `198.51.101.${n}`;
      ips.push(ip);
      const saved = await publicBook(
        bookReq(ip, {
          code,
          itemId: item.id,
          preferredDate: today,
          customerPhone: `8${String(n).padStart(9, "0")}`,
          customerName: `Guest ${n}`
        })
      );
      expect(saved.status, `attempt ${n}`).toBe(200);
      bookingIds.push((await saved.json()).id);
    }
    const ip = "198.51.101.21";
    ips.push(ip);
    const limited = await publicBook(
      bookReq(ip, {
        code,
        itemId: item.id,
        preferredDate: today,
        customerPhone: "8111111111",
        customerName: "Guest 21"
      })
    );
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: "Too many requests" });
    expect(await prisma.bookingRequest.count({ where: { businessId: business.id } })).toBe(20);
  }, 40000);

  it("locks booking when the catalogue plan omits Menu", async () => {
    const stamp = Date.now().toString(36);
    const ip = `198.51.100.${(stamp.length % 50) + 20}`;
    ips.push(ip);
    const owner = await prisma.user.create({
      data: {
        email: `svc-lock-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date("2027-08-01T00:00:00.000Z")
      }
    });
    userIds.push(owner.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Reviews only",
        nameHi: "Reviews only",
        slug: `svc-lock-${stamp}`,
        modules: ["REVIEWS"],
        limits: { businesses: 5, qrCodes: 10, products: 50, staff: 5, aiCalls: 10, storeProducts: 50, storeOrders: 50 },
        legacyTier: "STARTER"
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: owner.id,
        planId: plan.id,
        modules: ["REVIEWS"],
        limits: { businesses: 5 },
        tier: "STARTER",
        status: "ACTIVE",
        endsAt: owner.subscriptionEndsAt
      }
    });
    const business = await prisma.business.create({
      data: { ownerId: owner.id, name: "Locked", slug: `svc-lock-${stamp}`, whatsappNumber: "9876543210" }
    });
    businessIds.push(business.id);
    const code = `SL${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: business.id, label: "Desk", shortCode: code } });
    const item = await prisma.menuItem.create({
      data: { businessId: business.id, name: "Consult", pricePaise: 30000, kind: "SERVICE", durationMinutes: 15 }
    });
    const res = await publicBook(
      bookReq(ip, { code, itemId: item.id, preferredDate: istDayKey(new Date()), customerPhone: "9000000099" })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("PLAN_REQUIRED");
    expect(body.feature).toBe("services-booking");
    const pair = await issueTokenPair(owner, { deviceName: "locked" });
    const listed = await v1List(bearer(`/api/v1/bookings?businessId=${business.id}`, pair.accessToken));
    expect(listed.status).toBe(403);
    expect((await listed.json()).feature).toBe("services-booking");
  });

  it("keeps the product catalogue when Store is on and booking is locked", async () => {
    const stamp = Date.now().toString(36);
    const owner = await prisma.user.create({
      data: {
        email: `svc-store-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: new Date("2027-08-01T00:00:00.000Z")
      }
    });
    userIds.push(owner.id);
    const plan = await prisma.plan.create({
      data: {
        nameEn: "Store only",
        nameHi: "Store only",
        slug: `svc-store-${stamp}`,
        modules: ["STORE"],
        limits: { businesses: 5, qrCodes: 10, products: 50, staff: 5, aiCalls: 10, storeProducts: 50, storeOrders: 50 },
        legacyTier: "STARTER",
        visibleOnPricingPage: false
      }
    });
    planIds.push(plan.id);
    await prisma.subscription.create({
      data: {
        userId: owner.id,
        planId: plan.id,
        modules: ["STORE"],
        limits: { businesses: 5 },
        tier: "STARTER",
        status: "ACTIVE",
        endsAt: owner.subscriptionEndsAt
      }
    });
    const business = await prisma.business.create({
      data: {
        ownerId: owner.id,
        name: "Store only",
        slug: `svc-store-${stamp}`,
        catalogMode: "SERVICES"
      }
    });
    businessIds.push(business.id);
    const catalogue = await publicCatalogue(owner.id);
    expect(catalogue).toEqual({ showCatalogue: true, canOrder: true, canBookServices: false });
    const mode = await prisma.business.findUnique({ where: { id: business.id } });
    expect(mode?.catalogMode).toBe("SERVICES");
    expect(publicServicesView({ catalogMode: "SERVICES", canBookServices: catalogue.canBookServices })).toBe("message");
    expect(publicServicesView({ catalogMode: "BOTH", canBookServices: false })).toBe("menu");
    expect(publicServicesView({ catalogMode: "MENU", view: "services", canBookServices: false })).toBe("menu");
    expect(publicServicesView({ catalogMode: "MENU", canBookServices: true })).toBe("menu");
    expect(publicServicesView({ catalogMode: "SERVICES", canBookServices: true })).toBe("board");
  });
});

function bookReq(
  ip: string,
  extra: {
    code: string;
    itemId: string;
    preferredDate: string;
    variantId?: string;
    customerPhone?: string;
    customerName?: string;
    consent?: boolean;
  },
  userAgent = "Mozilla/5.0"
) {
  return new NextRequest("http://127.0.0.1/api/public/bookings", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip, "user-agent": userAgent },
    body: JSON.stringify({
      code: extra.code,
      itemId: extra.itemId,
      variantId: extra.variantId,
      customerName: extra.customerName || "Asha",
      customerPhone: extra.customerPhone || "9876543210",
      consent: extra.consent ?? true,
      preferredDate: extra.preferredDate,
      preferredSlot: "MORNING",
      source: "qr"
    })
  });
}

function bearer(path: string, token: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

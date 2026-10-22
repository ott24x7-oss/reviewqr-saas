import { afterAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const sessionUser = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../../lib/auth")>("../../lib/auth");
  return {
    ...actual,
    requireUser: async () => {
      if (!sessionUser.id) throw new Error("UNAUTHORIZED");
      return { id: sessionUser.id, role: "USER", email: "gate@example.test" };
    }
  };
});

import { POST as cleanPost } from "../../app/api/businesses/[id]/menu/clean/route";
import { POST as copyPost } from "../../app/api/businesses/[id]/menu/copy/route";
import { POST as importPost } from "../../app/api/businesses/[id]/menu/import/route";
import { GET as posterGet } from "../../app/api/businesses/[id]/store/poster/route";
import { GET as ordersGet } from "../../app/api/orders/route";
import { POST as couponPost } from "../../app/api/public/coupons/route";
import { POST as snapPost } from "../../app/api/v1/businesses/[id]/menu/snap/route";
import { GET as v1Orders } from "../../app/api/v1/orders/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";
import { applyOfferAction, listCoupons, listOfferBanners } from "../../lib/store/offer-action";
import { setOrderStatus } from "../../lib/store/order-command";

const MENU_LOCK = "Add Menu to show your catalogue on the tap page.";
const STORE_LOCK = "Add WhatsApp Store to take orders.";

describe("menu and store module gates", () => {
  const users: string[] = [];
  const plans: string[] = [];
  const businesses: string[] = [];

  afterAll(async () => {
    if (businesses.length) {
      await prisma.menuOrder.deleteMany({ where: { businessId: { in: businesses } } });
      await prisma.qRCode.deleteMany({ where: { businessId: { in: businesses } } });
      await prisma.business.deleteMany({ where: { id: { in: businesses } } });
    }
    if (users.length) {
      await prisma.refreshSession.deleteMany({ where: { userId: { in: users } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: users } } });
      await prisma.user.deleteMany({ where: { id: { in: users } } });
    }
    if (plans.length) await prisma.plan.deleteMany({ where: { id: { in: plans } } });
  });

  async function owner(kind: "reviews" | "free") {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
    const user = await prisma.user.create({
      data: {
        email: `gate-${kind}-${stamp}@example.test`,
        role: "USER",
        subscriptionTier: kind === "free" ? "FREE" : "STARTER",
        subscriptionStatus: "ACTIVE",
        subscriptionEndsAt: kind === "free" ? null : new Date("2027-08-01T00:00:00.000Z")
      }
    });
    users.push(user.id);
    if (kind === "reviews") {
      const plan = await prisma.plan.create({
        data: {
          nameEn: "Reviews only",
          nameHi: "सिर्फ़ रिव्यू",
          slug: `reviews-only-${stamp}`,
          modules: ["REVIEWS"],
          limits: { businesses: 1, qrCodes: 4, products: 12 },
          legacyTier: "STARTER"
        }
      });
      plans.push(plan.id);
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          modules: ["REVIEWS"],
          limits: { businesses: 1, qrCodes: 4, products: 12, aiCalls: 5, aiCallsPerMonth: 5 },
          tier: "STARTER",
          status: "ACTIVE",
          endsAt: user.subscriptionEndsAt
        }
      });
    }
    const business = await prisma.business.create({
      data: { ownerId: user.id, name: `Gate ${kind}`, slug: `gate-${kind}-${stamp}` }
    });
    businesses.push(business.id);
    const code = `G${stamp}`.slice(0, 12).toUpperCase();
    await prisma.qRCode.create({ data: { businessId: business.id, label: "Counter", shortCode: code } });
    return { user, business, code };
  }

  function jsonCall(path: string, body: unknown) {
    return new NextRequest(`http://127.0.0.1${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  it("blocks menu AI, store offers, orders, coupons, and the poster without those modules", async () => {
    const { user, business, code } = await owner("reviews");
    sessionUser.id = user.id;
    const params = { params: { id: business.id } };

    const clean = await cleanPost(jsonCall(`/api/businesses/${business.id}/menu/clean`, {}), params);
    const copy = await copyPost(jsonCall(`/api/businesses/${business.id}/menu/copy`, {}), params);
    const imported = await importPost(jsonCall(`/api/businesses/${business.id}/menu/import`, {}), params);
    expect(clean.status).toBe(403);
    expect(copy.status).toBe(403);
    expect(imported.status).toBe(403);
    expect((await clean.json()).error).toBe(MENU_LOCK);

    const pair = await issueTokenPair(user, { deviceName: "test" });
    const snap = await snapPost(
      new NextRequest(`http://127.0.0.1/api/v1/businesses/${business.id}/menu/snap`, {
        method: "POST",
        headers: { authorization: `Bearer ${pair.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ image: "x".repeat(40) })
      }),
      params
    );
    expect(snap.status).toBe(403);

    const offer = await applyOfferAction(user.id, business.id, { action: "coupon" });
    const coupons = await listCoupons(user.id, business.id, { limit: 10, cursorId: null });
    const banners = await listOfferBanners(user.id, business.id, { limit: 10, cursorId: null });
    expect(offer.ok).toBe(false);
    expect(coupons.ok).toBe(false);
    expect(banners.ok).toBe(false);
    if (!offer.ok) expect(offer.error).toBe(STORE_LOCK);

    const order = await prisma.menuOrder.create({
      data: { businessId: business.id, number: `G${business.id.slice(-8)}`, totalPaise: 100, items: [] }
    });
    const status = await setOrderStatus(user.id, order.id, { status: "ACCEPTED" });
    expect(status.ok).toBe(false);
    if (!status.ok) expect(status.error).toBe(STORE_LOCK);

    const orders = await ordersGet();
    expect(orders.status).toBe(403);
    const v1 = await v1Orders(
      new NextRequest("http://127.0.0.1/api/v1/orders", {
        headers: { authorization: `Bearer ${pair.accessToken}` }
      })
    );
    expect(v1.status).toBe(403);

    const coupon = await couponPost(
      jsonCall("/api/public/coupons", { code, coupon: "SAVE10", subtotalPaise: 5000 })
    );
    expect(coupon.status).toBe(403);
    expect((await coupon.json()).error).toBe(STORE_LOCK);

    const poster = await posterGet(new Request("http://127.0.0.1/poster"), params);
    expect(poster.status).toBe(403);
  });

  it("still lets a free owner past the menu and store gates", async () => {
    const { user, business, code } = await owner("free");
    sessionUser.id = user.id;
    const params = { params: { id: business.id } };
    const copy = await copyPost(jsonCall(`/api/businesses/${business.id}/menu/copy`, {}), params);
    expect(copy.status).toBe(400);

    const orders = await ordersGet();
    expect(orders.status).toBe(200);
    const poster = await posterGet(new Request("http://127.0.0.1/poster"), params);
    expect(poster.status).toBe(200);
    expect(poster.headers.get("content-type")).toContain("application/pdf");

    const coupon = await couponPost(
      jsonCall("/api/public/coupons", { code, coupon: "SAVE10", subtotalPaise: 5000 })
    );
    expect(coupon.status).not.toBe(403);
  });

  it("does not block staff who can read a store business they do not own", async () => {
    const storeOwner = await owner("free");
    const locked = await owner("reviews");
    await prisma.businessMember.create({
      data: { businessId: storeOwner.business.id, userId: locked.user.id, role: "STAFF" }
    });
    sessionUser.id = locked.user.id;
    const orders = await ordersGet();
    expect(orders.status).toBe(200);
  });
});

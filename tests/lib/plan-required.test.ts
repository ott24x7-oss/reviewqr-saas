import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FEATURES, type FeatureId } from "@reviewqr/shared";

const sessionUser = vi.hoisted(() => ({
  id: "",
  role: "USER" as const,
  email: "plan-required@example.test",
  name: null as string | null,
  phone: null as string | null,
  pushEnabled: false,
  subscriptionTier: "STARTER" as "FREE" | "STARTER",
  subscriptionStatus: "ACTIVE" as const,
  trialEndsAt: null as Date | null,
  subscriptionEndsAt: new Date("2027-08-01T00:00:00.000Z") as Date | null
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("../../lib/auth")>("../../lib/auth");
  return {
    ...actual,
    requireUser: async () => {
      if (!sessionUser.id) throw new Error("UNAUTHORIZED");
      return { ...sessionUser };
    }
  };
});

vi.mock("@/lib/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("../../lib/rate-limit")>("../../lib/rate-limit");
  return { ...actual, verifyTurnstile: async () => ({ ok: true, skipped: true as const }) };
});

import { GET as ordersGet } from "../../app/api/orders/route";
import { POST as publicOrders } from "../../app/api/public/orders/route";
import { POST as publicCoupons } from "../../app/api/public/coupons/route";
import { POST as publicReviews } from "../../app/api/public/reviews/route";
import { POST as publicPolish } from "../../app/api/public/ai/polish/route";
import { PUT as storePut } from "../../app/api/businesses/[id]/store/route";
import { POST as campaignsPost } from "../../app/api/businesses/[id]/campaigns/route";
import { GET as customersExport } from "../../app/api/customers/export/route";
import { GET as reviewsExport } from "../../app/api/export/reviews/route";
import { GET as templatesGet } from "../../app/api/businesses/[id]/review-templates/route";
import { POST as testimonialsPost } from "../../app/api/businesses/[id]/testimonials/route";
import { GET as membersGet } from "../../app/api/businesses/[id]/members/route";
import { GET as locationsGet } from "../../app/api/businesses/[id]/locations/route";
import { POST as qrPost, PATCH as qrPatch } from "../../app/api/businesses/[id]/qr/route";
import { POST as tapPost } from "../../app/api/businesses/[id]/tap/route";
import { POST as themePost } from "../../app/api/businesses/[id]/theme/route";
import { POST as snapPost } from "../../app/api/businesses/[id]/menu/snap/route";
import { PATCH as settingsPatch } from "../../app/api/settings/route";
import { GET as v1Orders } from "../../app/api/v1/orders/route";
import { GET as v1Customers } from "../../app/api/v1/customers/route";
import { GET as v1Analytics } from "../../app/api/v1/analytics/route";
import { GET as v1Report } from "../../app/api/v1/reports/monthly/route";
import { GET as v1Staff } from "../../app/api/v1/businesses/[id]/staff/route";
import { GET as v1Menu } from "../../app/api/v1/businesses/[id]/menu/route";
import { GET as v1Store } from "../../app/api/v1/businesses/[id]/store/route";
import { GET as v1Reviews } from "../../app/api/v1/businesses/[id]/reviews/route";
import { GET as v1Locations } from "../../app/api/v1/businesses/[id]/locations/route";
import { GET as v1Campaigns } from "../../app/api/v1/businesses/[id]/campaigns/route";
import { GET as v1Ai } from "../../app/api/v1/businesses/[id]/ai/route";
import { GET as v1Feedback } from "../../app/api/v1/feedback/route";
import { GET as v1Testimonials } from "../../app/api/v1/businesses/[id]/testimonials/route";
import { GET as v1Coupons } from "../../app/api/v1/businesses/[id]/coupons/route";
import { issueTokenPair } from "../../lib/auth/sessions";
import { prisma } from "../../lib/db";
import { featureBlock } from "../../lib/plans/feature-gate";

const LIMITS = {
  businesses: 5,
  qrCodes: 10,
  products: 50,
  staff: 10,
  aiCalls: 50,
  aiCallsPerMonth: 50,
  locations: 10,
  reviews: 100,
  campaigns: 10,
  reviewTemplates: 20,
  storeProducts: 50,
  storeOrders: 100
};

type Kind = "reviews" | "menu" | "store" | "free";
type Owner = {
  kind: Kind;
  userId: string;
  businessId: string;
  slug: string;
  code: string;
  token: string;
};

const owners: Partial<Record<Kind, Owner>> = {};
const userIds: string[] = [];
const planIds: string[] = [];
const businessIds: string[] = [];

function useSession(kind: Kind) {
  const owner = owners[kind]!;
  sessionUser.id = owner.userId;
  sessionUser.subscriptionTier = kind === "free" ? "FREE" : "STARTER";
  sessionUser.subscriptionEndsAt = kind === "free" ? null : new Date("2027-08-01T00:00:00.000Z");
}

function json(path: string, body: unknown, method = "POST") {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

function bearer(path: string, token: string, method = "GET") {
  return new NextRequest(`http://127.0.0.1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` }
  });
}

async function expectWeb(res: Response, feature: FeatureId, label: string) {
  const body = await res.json();
  expect(res.status, label).toBe(403);
  expect(body.code, label).toBe("PLAN_REQUIRED");
  expect(body.feature, label).toBe(feature);
  expect(typeof body.error, label).toBe("string");
}

async function expectV1(res: Response, feature: FeatureId, label: string) {
  const body = await res.json();
  expect(res.status, label).toBe(403);
  expect(body.code, label).toBe("PLAN_REQUIRED");
  expect(body.feature, label).toBe(feature);
  expect(body.error?.code, label).toBe("PLAN_REQUIRED");
  expect(body.error?.feature, label).toBe(feature);
  expect(typeof body.error?.message, label).toBe("string");
}

async function expectOpen(res: Response, label: string) {
  if (res.status !== 403) return;
  const body = await res.json().catch(() => ({}));
  expect(body?.code, label).not.toBe("PLAN_REQUIRED");
}

describe("PLAN_REQUIRED feature gates", () => {
  beforeAll(async () => {
    for (const kind of ["reviews", "menu", "store", "free"] as const) {
      const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString(36)}`;
      const modules = kind === "reviews" ? ["REVIEWS"] : kind === "menu" ? ["MENU"] : kind === "store" ? ["STORE"] : [];
      const user = await prisma.user.create({
        data: {
          email: `plan-${kind}-${stamp}@example.test`,
          role: "USER",
          subscriptionTier: kind === "free" ? "FREE" : "STARTER",
          subscriptionStatus: "ACTIVE",
          subscriptionEndsAt: kind === "free" ? null : new Date("2027-08-01T00:00:00.000Z")
        }
      });
      userIds.push(user.id);
      if (kind !== "free") {
        const plan = await prisma.plan.create({
          data: {
            nameEn: `${kind} only`,
            nameHi: `${kind} only`,
            slug: `plan-${kind}-${stamp}`,
            modules,
            limits: LIMITS,
            legacyTier: "STARTER"
          }
        });
        planIds.push(plan.id);
        await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            modules,
            limits: LIMITS,
            tier: "STARTER",
            status: "ACTIVE",
            endsAt: user.subscriptionEndsAt
          }
        });
      }
      const business = await prisma.business.create({
        data: {
          ownerId: user.id,
          name: `Plan ${kind}`,
          slug: `plan-${kind}-${stamp}`,
          aiReviewsEnabled: true
        }
      });
      businessIds.push(business.id);
      const code = `P${kind.slice(0, 1)}${stamp}`.slice(0, 12).toUpperCase();
      await prisma.qRCode.create({ data: { businessId: business.id, label: "Counter", shortCode: code } });
      const pair = await issueTokenPair(user, { deviceName: "plan-required" });
      owners[kind] = { kind, userId: user.id, businessId: business.id, slug: business.slug, code, token: pair.accessToken };
    }
  });

  afterAll(async () => {
    if (businessIds.length) {
      await prisma.menuOrder.deleteMany({ where: { businessId: { in: businessIds } } });
      await prisma.business.deleteMany({ where: { id: { in: businessIds } } });
    }
    if (userIds.length) {
      await prisma.refreshSession.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    if (planIds.length) await prisma.plan.deleteMany({ where: { id: { in: planIds } } });
  });

  it("maps every owner feature onto the module the catalogue plan is missing", async () => {
    for (const feature of FEATURES) {
      const locked = feature.module === "REVIEWS" ? owners.store! : owners.reviews!;
      const open = feature.module === "MENU" ? owners.menu! : feature.module === "STORE" ? owners.store! : owners.reviews!;
      const denied = await featureBlock(locked.userId, feature.id);
      expect(denied?.code, feature.id).toBe("PLAN_REQUIRED");
      expect(denied?.feature, feature.id).toBe(feature.id);
      expect(denied?.status, feature.id).toBe(403);
      expect(await featureBlock(open.userId, feature.id), feature.id).toBeNull();
      expect(await featureBlock(owners.free!.userId, feature.id), feature.id).toBeNull();
    }
  });

  it("returns PLAN_REQUIRED from each web endpoint group", async () => {
    const reviews = owners.reviews!;
    const store = owners.store!;
    const menu = owners.menu!;
    const biz = (id: string) => ({ params: { id } });

    useSession("reviews");
    await expectWeb(
      await snapPost(json(`/api/businesses/${reviews.businessId}/menu/snap`, { image: "x".repeat(40) }), biz(reviews.businessId)),
      "menu",
      "menu snap"
    );
    await expectWeb(await ordersGet(), "orders", "orders");
    await expectWeb(
      await publicOrders(json("/api/public/orders", { code: reviews.code, items: [{ id: "item", qty: 1 }] })),
      "whatsapp-orders",
      "whatsapp orders"
    );
    await expectWeb(await storePut(json(`/api/businesses/${reviews.businessId}/store`, {}, "PUT"), biz(reviews.businessId)), "store", "store");
    await expectWeb(
      await publicCoupons(json("/api/public/coupons", { code: reviews.code, coupon: "SAVE10", subtotalPaise: 5000 })),
      "offers",
      "offers"
    );

    useSession("store");
    await expectWeb(await campaignsPost(json(`/api/businesses/${store.businessId}/campaigns`, {}), biz(store.businessId)), "campaigns", "campaigns");
    await expectWeb(await customersExport(), "customers", "customers");
    await expectWeb(
      await reviewsExport(new NextRequest(`http://127.0.0.1/api/export/reviews?businessId=${store.businessId}`)),
      "reviews-log",
      "reviews export"
    );
    await expectWeb(
      await templatesGet(new NextRequest(`http://127.0.0.1/api/businesses/${store.businessId}/review-templates`), biz(store.businessId)),
      "reviews-log",
      "review templates"
    );
    await expectWeb(
      await publicReviews(json("/api/public/reviews", { businessSlug: store.slug, rating: 5, feedback: "Great coffee" })),
      "reviews-log",
      "public reviews"
    );
    await expectWeb(await testimonialsPost(json(`/api/businesses/${store.businessId}/testimonials`, {}), biz(store.businessId)), "testimonials", "testimonials");
    await expectWeb(
      await publicPolish(json("/api/public/ai/polish", { slug: store.slug, text: "The coffee was excellent today" })),
      "ai-replies",
      "ai replies"
    );
    await expectWeb(await membersGet(new NextRequest("http://127.0.0.1/api/members"), biz(store.businessId)), "staff", "staff");
    await expectWeb(await locationsGet(new NextRequest("http://127.0.0.1/api/locations"), biz(store.businessId)), "locations", "locations");
    await expectWeb(
      await qrPost(json(`/api/businesses/${store.businessId}/qr`, { type: "COUNTER", label: "Second" }), biz(store.businessId)),
      "multiple-qrs",
      "multiple qrs"
    );
    await expectWeb(
      await qrPatch(
        json(`/api/businesses/${store.businessId}/qr`, { action: "direct", code: store.code, mode: "DIRECT", target: "google" }, "PATCH"),
        biz(store.businessId)
      ),
      "direct-link",
      "direct link"
    );
    await expectWeb(
      await tapPost(
        json(`/api/businesses/${store.businessId}/tap`, { action: "draft", links: [], directMode: "DIRECT", directTarget: "google" }),
        biz(store.businessId)
      ),
      "direct-link",
      "tap direct"
    );
    await expectWeb(
      await themePost(json(`/api/businesses/${store.businessId}/theme`, { action: "reset" }), biz(store.businessId)),
      "page-themes",
      "page themes"
    );
    await expectWeb(
      await tapPost(
        json(`/api/businesses/${store.businessId}/tap`, { action: "draft", links: [], themeId: "minimal" }),
        biz(store.businessId)
      ),
      "page-themes",
      "tap theme"
    );
    await expectWeb(await settingsPatch(json("/api/settings", { whiteLabelDomain: "shop.example.test" }, "PATCH")), "custom-domain", "custom domain");

    useSession("menu");
    await expectOpen(await snapPost(json(`/api/businesses/${menu.businessId}/menu/snap`, {}), biz(menu.businessId)), "menu owner snap");
    useSession("store");
    await expectOpen(await ordersGet(), "store owner orders");
    await expectOpen(await storePut(json(`/api/businesses/${store.businessId}/store`, {}, "PUT"), biz(store.businessId)), "store owner settings");
    useSession("reviews");
    await expectOpen(await campaignsPost(json(`/api/businesses/${reviews.businessId}/campaigns`, {}), biz(reviews.businessId)), "reviews owner campaigns");
    await expectOpen(await customersExport(), "reviews owner customers");
    await expectOpen(await locationsGet(new NextRequest("http://127.0.0.1/api/locations"), biz(reviews.businessId)), "reviews owner locations");
    await expectOpen(await membersGet(new NextRequest("http://127.0.0.1/api/members"), biz(reviews.businessId)), "reviews owner staff");
    await expectOpen(
      await themePost(json(`/api/businesses/${reviews.businessId}/theme`, { action: "nope" }), biz(reviews.businessId)),
      "reviews owner theme"
    );
    await expectOpen(await settingsPatch(json("/api/settings", { whiteLabelDomain: "shop.example.test" }, "PATCH")), "reviews owner domain");

    useSession("free");
    await expectOpen(await ordersGet(), "free orders");
    await expectOpen(await locationsGet(new NextRequest("http://127.0.0.1/api/locations"), biz(owners.free!.businessId)), "free locations");
    await expectOpen(await customersExport(), "free customers");
    await expectOpen(await settingsPatch(json("/api/settings", { whiteLabelDomain: "shop.example.test" }, "PATCH")), "free domain");
  });

  it("returns PLAN_REQUIRED from each /api/v1 endpoint group", async () => {
    const reviews = owners.reviews!;
    const store = owners.store!;
    const menu = owners.menu!;
    const biz = (id: string) => ({ params: { id } });

    await expectV1(await v1Menu(bearer(`/api/v1/businesses/${reviews.businessId}/menu`, reviews.token), biz(reviews.businessId)), "menu", "v1 menu");
    await expectV1(await v1Orders(bearer("/api/v1/orders", reviews.token)), "orders", "v1 orders");
    await expectV1(await v1Store(bearer(`/api/v1/businesses/${reviews.businessId}/store`, reviews.token), biz(reviews.businessId)), "store", "v1 store");
    await expectV1(await v1Coupons(bearer(`/api/v1/businesses/${reviews.businessId}/coupons`, reviews.token), biz(reviews.businessId)), "offers", "v1 offers");

    await expectV1(await v1Campaigns(bearer(`/api/v1/businesses/${store.businessId}/campaigns`, store.token), biz(store.businessId)), "campaigns", "v1 campaigns");
    await expectV1(await v1Customers(bearer(`/api/v1/customers?businessId=${store.businessId}`, store.token)), "customers", "v1 customers");
    await expectV1(await v1Reviews(bearer(`/api/v1/businesses/${store.businessId}/reviews`, store.token), biz(store.businessId)), "reviews-log", "v1 reviews");
    await expectV1(
      await v1Feedback(bearer(`/api/v1/feedback?businessId=${store.businessId}`, store.token)),
      "reviews-log",
      "v1 feedback"
    );
    await expectV1(
      await v1Testimonials(bearer(`/api/v1/businesses/${store.businessId}/testimonials`, store.token), biz(store.businessId)),
      "testimonials",
      "v1 testimonials"
    );
    await expectV1(await v1Ai(bearer(`/api/v1/businesses/${store.businessId}/ai`, store.token), biz(store.businessId)), "ai-replies", "v1 ai");
    await expectV1(
      await v1Analytics(bearer(`/api/v1/analytics?businessId=${store.businessId}`, store.token)),
      "analytics",
      "v1 analytics"
    );
    await expectV1(
      await v1Report(bearer(`/api/v1/reports/monthly?businessId=${store.businessId}`, store.token)),
      "pdf-report",
      "v1 pdf"
    );
    await expectV1(await v1Staff(bearer(`/api/v1/businesses/${store.businessId}/staff`, store.token), biz(store.businessId)), "staff", "v1 staff");
    await expectV1(
      await v1Locations(bearer(`/api/v1/businesses/${store.businessId}/locations`, store.token), biz(store.businessId)),
      "locations",
      "v1 locations"
    );

    await expectOpen(await v1Menu(bearer(`/api/v1/businesses/${menu.businessId}/menu`, menu.token), biz(menu.businessId)), "menu owner v1 menu");
    await expectOpen(await v1Orders(bearer("/api/v1/orders", store.token)), "store owner v1 orders");
    await expectOpen(await v1Store(bearer(`/api/v1/businesses/${store.businessId}/store`, store.token), biz(store.businessId)), "store owner v1 store");
    await expectOpen(await v1Reviews(bearer(`/api/v1/businesses/${reviews.businessId}/reviews`, reviews.token), biz(reviews.businessId)), "reviews owner v1 reviews");
    await expectOpen(await v1Campaigns(bearer(`/api/v1/businesses/${reviews.businessId}/campaigns`, reviews.token), biz(reviews.businessId)), "reviews owner v1 campaigns");
    await expectOpen(await v1Customers(bearer(`/api/v1/customers?businessId=${reviews.businessId}`, reviews.token)), "reviews owner v1 customers");
    await expectOpen(await v1Ai(bearer(`/api/v1/businesses/${reviews.businessId}/ai`, reviews.token), biz(reviews.businessId)), "reviews owner v1 ai");
    await expectOpen(await v1Analytics(bearer(`/api/v1/analytics?businessId=${reviews.businessId}`, reviews.token)), "reviews owner v1 analytics");
    await expectOpen(await v1Report(bearer(`/api/v1/reports/monthly?businessId=${reviews.businessId}`, reviews.token)), "reviews owner v1 pdf");
    await expectOpen(await v1Staff(bearer(`/api/v1/businesses/${reviews.businessId}/staff`, reviews.token), biz(reviews.businessId)), "reviews owner v1 staff");
    await expectOpen(await v1Locations(bearer(`/api/v1/businesses/${reviews.businessId}/locations`, reviews.token), biz(reviews.businessId)), "reviews owner v1 locations");
    await expectOpen(await v1Menu(bearer(`/api/v1/businesses/${owners.free!.businessId}/menu`, owners.free!.token), biz(owners.free!.businessId)), "free v1 menu");
    await expectOpen(await v1Orders(bearer("/api/v1/orders", owners.free!.token)), "free v1 orders");
    await expectOpen(await v1Reviews(bearer(`/api/v1/businesses/${owners.free!.businessId}/reviews`, owners.free!.token), biz(owners.free!.businessId)), "free v1 reviews");
  });

  it("lets staff use the business owner's plan", async () => {
    const staff = owners.store!;
    const reviews = owners.reviews!;
    await prisma.businessMember.create({
      data: { businessId: reviews.businessId, userId: staff.userId, role: "STAFF" }
    });
    const biz = (id: string) => ({ params: { id } });
    await expectOpen(
      await v1Reviews(bearer(`/api/v1/businesses/${reviews.businessId}/reviews`, staff.token), biz(reviews.businessId)),
      "staff inherits reviews"
    );
    await expectV1(
      await v1Menu(bearer(`/api/v1/businesses/${reviews.businessId}/menu`, staff.token), biz(reviews.businessId)),
      "menu",
      "staff inherits missing menu"
    );
    await expectOpen(await v1Store(bearer(`/api/v1/businesses/${staff.businessId}/store`, staff.token), biz(staff.businessId)), "staff keeps own store");
    await expectV1(
      await v1Reviews(bearer(`/api/v1/businesses/${staff.businessId}/reviews`, staff.token), biz(staff.businessId)),
      "reviews-log",
      "staff own business stays reviews-locked"
    );
  });

  it("has no owner HTTP route for NFC, so the module check is the gate", async () => {
    expect((await featureBlock(owners.store!.userId, "nfc"))?.feature).toBe("nfc");
    expect(await featureBlock(owners.reviews!.userId, "nfc")).toBeNull();
  });
});

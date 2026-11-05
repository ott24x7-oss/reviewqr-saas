import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  featureBlock: vi.fn(),
  accountFeatureBlock: vi.fn(),
  planFindMany: vi.fn(),
  businessFindMany: vi.fn(),
  loadEntitlement: vi.fn()
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/lib/db", () => ({
  prisma: {
    plan: { findMany: mocks.planFindMany },
    business: { findMany: mocks.businessFindMany }
  }
}));
vi.mock("@/lib/plans/feature-gate", () => ({
  featureBlock: mocks.featureBlock,
  accountFeatureBlock: mocks.accountFeatureBlock
}));
vi.mock("@/lib/plans/entitlements", () => ({ loadEntitlement: mocks.loadEntitlement }));

import { requireAccountFeature, requireFeature, requireFeatureForRoute } from "@/lib/plans/dashboard-gate";
import { DASHBOARD_FEATURE_ROUTES, dashboardFeatureForRoute } from "@/lib/plans/dashboard-route-features";
import { featureById, isFeatureId } from "@reviewqr/shared";

describe("dashboard feature gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ role: "USER" });
    mocks.featureBlock.mockResolvedValue(null);
    mocks.accountFeatureBlock.mockResolvedValue(null);
    mocks.planFindMany.mockResolvedValue([]);
  });

  it("returns a locked state and catalog plans for a locked owner", async () => {
    mocks.featureBlock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Plan required",
      code: "PLAN_REQUIRED",
      feature: "menu"
    });
    mocks.planFindMany.mockResolvedValue([
      { slug: "menu-plus", nameEn: "Menu Plus", nameHi: "मेनू प्लस" }
    ]);

    await expect(requireFeature("owner-1", "menu")).resolves.toEqual({
      featureId: "menu",
      plans: [{ slug: "menu-plus", nameEn: "Menu Plus", nameHi: "मेनू प्लस" }]
    });
    expect(mocks.featureBlock).toHaveBeenCalledWith("owner-1", "menu");
    expect(mocks.planFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { active: true, visibleOnPricingPage: true, modules: { has: "MENU" } }
    }));
  });

  it("does not gate an admin session", async () => {
    mocks.getSessionUser.mockResolvedValue({ role: "ADMIN" });
    await expect(requireFeature("owner-1", "menu")).resolves.toBeNull();
    expect(mocks.featureBlock).not.toHaveBeenCalled();
  });

  it("resolves the route map before checking the owner plan", async () => {
    mocks.featureBlock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Plan required",
      code: "PLAN_REQUIRED",
      feature: "services-booking"
    });
    mocks.planFindMany.mockResolvedValue([]);

    await expect(requireFeatureForRoute("owner-1", "/dashboard/businesses/:id/menu", "services-booking")).resolves.toEqual({
      featureId: "services-booking",
      plans: []
    });
    expect(mocks.featureBlock).toHaveBeenCalledWith("owner-1", "services-booking");
  });

  it("supports account-level lock checks", async () => {
    mocks.accountFeatureBlock.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Plan required",
      code: "PLAN_REQUIRED",
      feature: "customers"
    });
    mocks.planFindMany.mockResolvedValue([
      { slug: "reviews-pro", nameEn: "Reviews Pro", nameHi: "रिव्यू प्रो" }
    ]);

    await expect(requireAccountFeature("user-1", "customers")).resolves.toEqual({
      featureId: "customers",
      plans: [{ slug: "reviews-pro", nameEn: "Reviews Pro", nameHi: "रिव्यू प्रो" }]
    });
    expect(mocks.accountFeatureBlock).toHaveBeenCalledWith("user-1", "customers");
  });
});

describe("dashboard route feature map", () => {
  it("maps every gated route and section to a known shared feature id", () => {
    expect(DASHBOARD_FEATURE_ROUTES.length).toBeGreaterThan(0);
    for (const { route, featureId } of DASHBOARD_FEATURE_ROUTES) {
      expect(isFeatureId(featureId), `${route} -> ${featureId}`).toBe(true);
      expect(featureById(featureId), `${route} -> ${featureId}`).not.toBeNull();
      const concretePath = route.replace(":id", "business-1").replace(":code", "qr-1");
      expect(dashboardFeatureForRoute(concretePath, featureId), `${route} -> ${featureId}`).toBe(featureId);
    }
    for (const featureId of [
      "reviews-log", "ai-replies", "testimonials", "customers", "campaigns", "analytics", "pdf-report",
      "staff", "locations", "nfc", "multiple-qrs", "direct-link", "page-themes", "menu", "services-booking",
      "orders", "whatsapp-orders", "store", "offers"
    ]) {
      expect(DASHBOARD_FEATURE_ROUTES.some((entry) => entry.featureId === featureId), featureId).toBe(true);
    }
  });
});

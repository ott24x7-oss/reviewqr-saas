import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  onboardingDraft: { findUnique: vi.fn(), upsert: vi.fn() },
  business: { count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  qRCode: { findFirst: vi.fn() },
  tapPage: { findUnique: vi.fn(), update: vi.fn() },
  menuItem: { createMany: vi.fn() },
  signupAttribution: { findUnique: vi.fn() },
  storeSettings: { create: vi.fn() }
}));

const dependencies = vi.hoisted(() => ({
  ownerLimitError: vi.fn(),
  generateQrDataUrl: vi.fn(),
  attachTapDraft: vi.fn(),
  createAssignedCode: vi.fn(),
  canonicalThemeId: vi.fn(),
  absoluteUrl: vi.fn(),
  checkSlug: vi.fn()
}));

vi.mock("../../lib/db", () => ({ prisma: database }));
vi.mock("../../lib/entitlements", () => ({ ownerLimitError: dependencies.ownerLimitError }));
vi.mock("../../lib/qr", () => ({ generateQrDataUrl: dependencies.generateQrDataUrl }));
vi.mock("../../lib/tap/new-business", () => ({ attachTapDraft: dependencies.attachTapDraft }));
vi.mock("../../lib/tap/qr-mutate", () => ({ createAssignedCode: dependencies.createAssignedCode }));
vi.mock("../../lib/tap/themes", () => ({ canonicalThemeId: dependencies.canonicalThemeId }));
vi.mock("../../lib/utils", () => ({ absoluteUrl: dependencies.absoluteUrl }));
vi.mock("../../lib/onboarding/slug", () => ({ checkSlug: dependencies.checkSlug }));

import { finishOnboarding } from "../../lib/onboarding/finish";
import { DEFAULT_STORE_RULES, orderTypesForCatalog } from "../../lib/store/pricing";

describe("finishOnboarding category defaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.onboardingDraft.findUnique.mockResolvedValue({ payload: null });
    database.onboardingDraft.upsert.mockResolvedValue({});
    database.business.count.mockResolvedValue(0);
    database.business.create.mockImplementation(async ({ data }: { data: { industry: string; slug: string; name: string } }) => ({
      id: `business-${data.industry}`,
      name: data.name,
      slug: data.slug
    }));
    database.business.findUnique.mockResolvedValue(null);
    database.business.update.mockResolvedValue({});
    database.qRCode.findFirst.mockResolvedValue(null);
    database.tapPage.findUnique.mockResolvedValue({ draft: {} });
    database.tapPage.update.mockResolvedValue({});
    database.menuItem.createMany.mockResolvedValue({ count: 0 });
    database.signupAttribution.findUnique.mockResolvedValue(null);
    database.storeSettings.create.mockResolvedValue({});
    dependencies.ownerLimitError.mockResolvedValue(null);
    dependencies.generateQrDataUrl.mockResolvedValue("data:image/png;base64,qr");
    dependencies.attachTapDraft.mockResolvedValue(undefined);
    dependencies.createAssignedCode.mockResolvedValue({ shortCode: "qr1234" });
    dependencies.canonicalThemeId.mockReturnValue("sunset-mango");
    dependencies.absoluteUrl.mockImplementation((path: string) => `https://example.test${path}`);
    dependencies.checkSlug.mockImplementation(async (slug: string) => ({ slug, available: true, reason: null, url: "", suggestions: [] }));
  });

  it.each([
    ["cafe", "MENU", true, true, false],
    ["salon", "SERVICES", false, false, false],
    ["clinic", "SERVICES", false, false, false],
    ["shop", "MENU", false, false, true],
    ["other", "MENU", false, false, true]
  ] as const)("creates %s in %s mode with matching order types", async (category, catalogMode, dineIn, takeaway, delivery) => {
    const slug = `${category}-onboarding`;
    database.onboardingDraft.findUnique.mockResolvedValue({
      payload: {
        name: `Test ${category}`,
        category,
        city: "Pune",
        whatsapp: "9876543210",
        themeId: "sunset-mango",
        slug,
        googleReviewUrl: "",
        items: []
      }
    });

    const result = await finishOnboarding({
      id: "owner-1",
      email: "owner@example.test",
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt: null,
      subscriptionEndsAt: null
    });

    expect(result.ok).toBe(true);
    expect(database.business.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ industry: category, catalogMode })
    }));
    expect(database.storeSettings.create).toHaveBeenCalledWith({
      data: { businessId: `business-${category}`, dineIn, takeaway, delivery }
    });
  });

  it("never offers ordering options in services mode, even if settings enable them", () => {
    const fatFingeredSettings = { ...DEFAULT_STORE_RULES, dineIn: true, takeaway: true, delivery: true };
    expect(orderTypesForCatalog(fatFingeredSettings, "SERVICES")).toEqual([]);
  });
});

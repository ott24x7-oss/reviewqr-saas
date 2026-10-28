import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { business: { findUnique: vi.fn() } },
  rateLimitDb: vi.fn(),
  getAiConfig: vi.fn(),
  generateReviewDrafts: vi.fn(),
  featureBlock: vi.fn(),
  planDeniedResponse: vi.fn()
}));

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/rate-limit", () => ({ rateLimitDb: mocks.rateLimitDb }));
vi.mock("@/lib/settings", () => ({ getAiConfig: mocks.getAiConfig }));
vi.mock("@/lib/ai", () => ({ generateReviewDrafts: mocks.generateReviewDrafts }));
vi.mock("@/lib/entitlements", () => ({ AiQuotaError: class AiQuotaError extends Error {} }));
vi.mock("@/lib/plans/feature-gate", () => ({
  featureBlock: mocks.featureBlock,
  planDeniedResponse: mocks.planDeniedResponse
}));

import { NextRequest } from "next/server";
import { POST } from "../../app/api/public/ai/review-drafts/route";

const business = {
  id: "business-1",
  ownerId: "owner-1",
  name: "Mango House",
  industry: "cafe",
  description: "A neighbourhood café",
  services: null,
  city: "Pune",
  website: null,
  reviewQaSpecialty: "Family recipes",
  reviewQaBestKnown: "Mango lassi",
  reviewQaAtmosphere: "Relaxed courtyard seating",
  reviewGating: true,
  ratingThreshold: 4,
  isActive: true,
  archived: false,
  aiReviewsEnabled: true
};

function request(body: unknown) {
  return new NextRequest("http://127.0.0.1/api/public/ai/review-drafts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("public AI review drafts endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimitDb.mockResolvedValue({ ok: true });
    mocks.prisma.business.findUnique.mockResolvedValue(business);
    mocks.featureBlock.mockResolvedValue(null);
    mocks.getAiConfig.mockResolvedValue({ enabled: true, apiUrl: "https://ai.example.test/v1", apiKey: "test", model: "test" });
    mocks.generateReviewDrafts.mockResolvedValue([
      "A lovely visit at Mango House—[what you enjoyed].",
      "I came to Mango House for [reason] and especially liked [detail].",
      "Mango House has a relaxed feel; [your own thought].",
      "The mango lassi sounds inviting—[what you tried and liked].",
      "The courtyard seating makes the place feel relaxed—[your experience].",
      "A nice neighbourhood spot for [what stood out]."
    ]);
  });

  it("generates six drafts from owner Q&A for a gated 4–5-star rating", async () => {
    const response = await POST(request({ slug: "mango-house", rating: 5, language: "en" }));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.drafts).toHaveLength(6);
    expect(mocks.generateReviewDrafts).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
      expect.objectContaining({
        reviewQaSpecialty: "Family recipes",
        reviewQaBestKnown: "Mango lassi",
        reviewQaAtmosphere: "Relaxed courtyard seating"
      }),
      { rating: 5, language: "en" },
      "business-1"
    );
  });

  it("does not generate drafts when review gating is disabled", async () => {
    mocks.prisma.business.findUnique.mockResolvedValue({ ...business, reviewGating: false });
    const response = await POST(request({ slug: "mango-house", rating: 5, language: "en" }));
    expect((await response.json()).fallback).toBe(true);
    expect(mocks.generateReviewDrafts).not.toHaveBeenCalled();
  });

  it("rejects a 1–3-star draft request", async () => {
    const response = await POST(request({ slug: "mango-house", rating: 3, language: "en" }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.business.findUnique).not.toHaveBeenCalled();
    expect(mocks.generateReviewDrafts).not.toHaveBeenCalled();
  });
});

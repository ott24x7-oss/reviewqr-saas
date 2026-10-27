import { describe, expect, it } from "vitest";
import {
  DEFAULT_REVIEW_GATING,
  orderedReviewTargets,
  reviewWasRedirected,
  showPublicReviewLinks,
  shouldRestoreReviewGatingDefault,
  REVIEW_GATING_OFF_MIGRATION_AT
} from "../../lib/review-policy";
import { businessSchema } from "../../lib/validations";

const urls = {
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=abc",
  trustpilotUrl: "https://www.trustpilot.com/evaluate/example.com"
};

describe("review gating defaults", () => {
  it("defaults new business API payloads and Prisma-created rows to enabled", () => {
    expect(DEFAULT_REVIEW_GATING).toBe(true);
    expect(businessSchema.parse({ name: "New business" }).reviewGating).toBe(true);
  });

  it("backfills only false rows that still match the forced-off default", () => {
    const cutoff = REVIEW_GATING_OFF_MIGRATION_AT;
    expect(
      shouldRestoreReviewGatingDefault({
        reviewGating: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: cutoff
      })
    ).toBe(true);
    expect(
      shouldRestoreReviewGatingDefault({
        reviewGating: false,
        createdAt: new Date("2026-10-22T00:00:00.000Z"),
        updatedAt: new Date("2026-10-22T00:00:00.000Z")
      })
    ).toBe(true);
    expect(
      shouldRestoreReviewGatingDefault({
        reviewGating: false,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-10-22T00:00:00.000Z")
      })
    ).toBe(false);
    expect(
      shouldRestoreReviewGatingDefault({
        reviewGating: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z")
      })
    ).toBe(false);
  });
});

describe("public review links", () => {
  it("keeps Google and Trustpilot in a stable order for every rating", () => {
    const first = orderedReviewTargets({ ...urls, reviewPlatform: "google" }).map((item) => item.platform);
    const second = orderedReviewTargets({ ...urls, reviewPlatform: "google" }).map((item) => item.platform);
    expect(first).toEqual(["google", "trustpilot"]);
    expect(second).toEqual(first);
    expect(orderedReviewTargets({ ...urls, reviewPlatform: "trustpilot" }).map((item) => item.platform)).toEqual([
      "trustpilot",
      "google"
    ]);
  });

  it("shows the public links for 1 star and 5 stars when gating is off", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(
        showPublicReviewLinks({
          reviewGating: false,
          rating,
          ratingThreshold: 4,
          hasPublicUrl: true
        })
      ).toBe(true);
    }
  });

  it("hides the public links below the threshold only when gating is on", () => {
    expect(
      showPublicReviewLinks({ reviewGating: true, rating: 2, ratingThreshold: 4, hasPublicUrl: true })
    ).toBe(false);
    expect(
      showPublicReviewLinks({ reviewGating: true, rating: 4, ratingThreshold: 4, hasPublicUrl: true })
    ).toBe(true);
    expect(
      showPublicReviewLinks({ reviewGating: false, rating: 1, ratingThreshold: 4, hasPublicUrl: false })
    ).toBe(false);
  });

  it("rejects a javascript review url", () => {
    expect(orderedReviewTargets({ googleReviewUrl: "javascript:alert(1)" })).toEqual([]);
  });
});

describe("redirected flag", () => {
  it("is true only after the customer opens a public link when gating is off", () => {
    expect(
      reviewWasRedirected({
        reviewGating: false,
        rating: 5,
        ratingThreshold: 4,
        hasFeedback: false,
        openedPublicReview: false
      })
    ).toBe(false);
    expect(
      reviewWasRedirected({
        reviewGating: false,
        rating: 1,
        ratingThreshold: 4,
        hasFeedback: true,
        openedPublicReview: true
      })
    ).toBe(true);
  });

  it("keeps the threshold rule when gating is on", () => {
    expect(
      reviewWasRedirected({
        reviewGating: true,
        rating: 5,
        ratingThreshold: 4,
        hasFeedback: false,
        openedPublicReview: false
      })
    ).toBe(true);
    expect(
      reviewWasRedirected({
        reviewGating: true,
        rating: 2,
        ratingThreshold: 4,
        hasFeedback: false,
        openedPublicReview: true
      })
    ).toBe(false);
  });
});

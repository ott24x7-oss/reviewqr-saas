import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_REVIEW_GATING,
  orderedReviewTargets,
  reviewWasRedirected,
  showPublicReviewLinks,
  shouldOfferAiReviewDrafts,
  publicReviewThreshold,
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

  it("keeps the SQL migration backfill constrained to untouched rows", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "prisma/migrations/20261110120000_restore_review_gating_default/migration.sql"),
      "utf8"
    ).replace(/\s+/g, " ");
    expect(migration).toContain('WHERE "reviewGating" = false');
    expect(migration).toContain('"updatedAt" <= TIMESTAMP \'2026-10-21 12:00:00\'');
    expect(migration).toContain('"createdAt" > TIMESTAMP \'2026-10-21 12:00:00\' AND "updatedAt" = "createdAt"');
  });
});

describe("public review links", () => {
  it("offers AI starters only for gated high ratings with the owner AI setting enabled", () => {
    const base = { reviewGating: true, aiEnabled: true, ratingThreshold: 4 };
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 4 })).toBe(true);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 5 })).toBe(true);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 3 })).toBe(false);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 3, ratingThreshold: 3 })).toBe(false);
    expect(publicReviewThreshold(3)).toBe(4);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 4, ratingThreshold: 5 })).toBe(false);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 5, reviewGating: false })).toBe(false);
    expect(shouldOfferAiReviewDrafts({ ...base, rating: 5, aiEnabled: false })).toBe(false);
  });

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
      showPublicReviewLinks({ reviewGating: true, rating: 3, ratingThreshold: 3, hasPublicUrl: true })
    ).toBe(false);
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
    expect(
      reviewWasRedirected({
        reviewGating: true,
        rating: 3,
        ratingThreshold: 3,
        hasFeedback: false,
        openedPublicReview: false
      })
    ).toBe(false);
  });
});

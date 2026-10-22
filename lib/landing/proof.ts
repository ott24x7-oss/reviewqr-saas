import { prisma } from "../db";

export type LandingTrust = {
  businesses: number | null;
  reviewCount: number | null;
  rating: number | null;
};

/** Real counts only. Empty database fields stay null so the page can hide them. */
export async function landingTrust(): Promise<LandingTrust> {
  const [businesses, reviews] = await Promise.all([
    prisma.business.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } })
  ]);
  const reviewCount = reviews._count._all;
  const average = reviews._avg.rating;
  return {
    businesses: businesses > 0 ? businesses : null,
    reviewCount: reviewCount > 0 ? reviewCount : null,
    rating: reviewCount > 0 && average != null ? Math.round(average * 10) / 10 : null
  };
}

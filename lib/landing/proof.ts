import { prisma } from "../db";
import { LANDING_STAT_MINIMUMS } from "./stats";

export type LandingQuote = {
  id: string;
  authorName: string;
  authorRole: string | null;
  message: string;
  rating: number;
};

export async function landingQuotes(): Promise<LandingQuote[]> {
  return prisma.testimonial.findMany({
    where: { isPublic: true, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, authorName: true, authorRole: true, message: true, rating: true }
  });
}

export type LandingTrust = {
  businesses: number | null;
  reviewCount: number | null;
  rating: number | null;
  /** WhatsApp menu orders. Null when none exist yet. */
  orderCount: number | null;
};

/** Real counts only. Empty database fields stay null so the page can hide them. */
export async function landingTrust(): Promise<LandingTrust> {
  const [businesses, reviews, orders] = await Promise.all([
    prisma.business.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.menuOrder.count()
  ]);
  const reviewCount = reviews._count._all;
  const average = reviews._avg.rating;
  const ratingReady = reviewCount >= LANDING_STAT_MINIMUMS.ratings && average != null;
  return {
    businesses: businesses > 0 ? businesses : null,
    reviewCount: reviewCount > 0 ? reviewCount : null,
    rating: ratingReady ? Math.round(average * 10) / 10 : null,
    orderCount: orders > 0 ? orders : null
  };
}

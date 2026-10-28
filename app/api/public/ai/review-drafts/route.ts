import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { getAiConfig } from "@/lib/settings";
import { generateReviewDrafts, type BusinessContext } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";
import { featureBlock, planDeniedResponse } from "@/lib/plans/feature-gate";
import { shouldOfferAiReviewDrafts } from "@/lib/review-policy";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `ai-review-drafts:${ip}`, limit: 12, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ drafts: [], fallback: true }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    rating?: number;
    language?: string;
  };
  const slug = body.slug?.trim();
  const rating = Number(body.rating);
  const language = body.language === "hi" ? "hi" : body.language === "en" ? "en" : null;
  if (!slug || !language || !Number.isInteger(rating) || rating < 4 || rating > 5) {
    return NextResponse.json({ error: "Choose a valid rating and language" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      name: true,
      industry: true,
      description: true,
      services: true,
      city: true,
      website: true,
      reviewQaSpecialty: true,
      reviewQaBestKnown: true,
      reviewQaAtmosphere: true,
      reviewGating: true,
      ratingThreshold: true,
      isActive: true,
      archived: true,
      aiReviewsEnabled: true
    }
  });
  if (!business || !business.isActive || business.archived || !business.aiReviewsEnabled) {
    return NextResponse.json({ drafts: [], fallback: true });
  }
  if (!shouldOfferAiReviewDrafts({
    reviewGating: business.reviewGating,
    aiEnabled: true,
    rating,
    ratingThreshold: business.ratingThreshold
  })) {
    return NextResponse.json({ drafts: [], fallback: true });
  }

  const locked = await featureBlock(business.ownerId, "ai-replies");
  if (locked) return planDeniedResponse(locked);
  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ drafts: [], fallback: true });

  const ctx: BusinessContext = {
    name: business.name,
    industry: business.industry,
    description: business.description,
    services: business.services,
    city: business.city,
    website: business.website,
    reviewQaSpecialty: business.reviewQaSpecialty,
    reviewQaBestKnown: business.reviewQaBestKnown,
    reviewQaAtmosphere: business.reviewQaAtmosphere
  };

  try {
    const drafts = await generateReviewDrafts(cfg, ctx, { rating, language }, business.id);
    return NextResponse.json({ drafts });
  } catch (error) {
    if (error instanceof AiQuotaError) {
      return NextResponse.json({ drafts: [], fallback: true, reason: error.reason });
    }
    return NextResponse.json({ drafts: [], fallback: true });
  }
}

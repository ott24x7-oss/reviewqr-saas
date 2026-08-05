import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { getAiConfig } from "@/lib/settings";
import { generateReviews, type BusinessContext } from "@/lib/ai";

/**
 * Public — AI-generated Google review suggestions from the customer's answers.
 * Returns { reviews: [] } on any failure so the flow degrades gracefully.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `ai-r:${ip}`, limit: 15, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ reviews: [] }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    rating?: number;
    answers?: Array<{ question?: string; answer?: string }>;
  };
  const slug = body.slug?.trim();
  if (!slug) return NextResponse.json({ reviews: [] });

  const rating = Math.min(5, Math.max(1, Number(body.rating) || 5));
  const answers = (Array.isArray(body.answers) ? body.answers : [])
    .map((a) => ({ question: String(a.question || "").slice(0, 200), answer: String(a.answer || "").slice(0, 200) }))
    .filter((a) => a.answer)
    .slice(0, 6);

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      name: true,
      industry: true,
      description: true,
      services: true,
      city: true,
      website: true,
      isActive: true,
      archived: true,
      aiReviewsEnabled: true
    }
  });
  if (!business || !business.isActive || business.archived || !business.aiReviewsEnabled) {
    return NextResponse.json({ reviews: [] });
  }

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ reviews: [] });

  const ctx: BusinessContext = {
    name: business.name,
    industry: business.industry,
    description: business.description,
    services: business.services,
    city: business.city,
    website: business.website
  };

  try {
    const reviews = await generateReviews(cfg, ctx, rating, answers);
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}

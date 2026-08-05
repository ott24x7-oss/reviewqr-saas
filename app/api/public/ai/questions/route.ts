import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { getAiConfig } from "@/lib/settings";
import { generateQuestions, type AiQuestion, type BusinessContext } from "@/lib/ai";

// Per-business question cache so we don't regenerate on every visitor.
const cache = new Map<string, { at: number; questions: AiQuestion[] }>();
const TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Public — AI-generated tap-to-answer questions for a happy customer.
 * Returns { available: false } whenever AI is off / unconfigured / the business
 * hasn't opted in, so the review flow can fall back to static templates.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `ai-q:${ip}`, limit: 20, windowSeconds: 60 });
  if (!rl.ok) return NextResponse.json({ available: false }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { slug?: string };
  const slug = body.slug?.trim();
  if (!slug) return NextResponse.json({ available: false });

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
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
    return NextResponse.json({ available: false });
  }

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ available: false });

  const hit = cache.get(business.id);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ available: true, questions: hit.questions });
  }

  const ctx: BusinessContext = {
    name: business.name,
    industry: business.industry,
    description: business.description,
    services: business.services,
    city: business.city,
    website: business.website
  };

  try {
    const questions = await generateQuestions(cfg, ctx);
    cache.set(business.id, { at: Date.now(), questions });
    return NextResponse.json({ available: true, questions });
  } catch {
    return NextResponse.json({ available: false });
  }
}

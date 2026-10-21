import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimitDb } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/utils";
import { getAiConfig } from "@/lib/settings";
import { polishReviewDraft, type BusinessContext } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";
import { draftWordCount } from "@/lib/review-policy";

/** Cleans up words the customer already wrote. Never posts the result. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimitDb({ key: `ai-polish:${ip}`, limit: 15, windowSeconds: 60 });
  if (!rl.ok) {
    return NextResponse.json({ suggestion: null, fallback: true }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as { slug?: string; text?: string };
  const slug = body.slug?.trim();
  const text = String(body.text || "").slice(0, 2000);
  if (!slug || draftWordCount(text) < 3) {
    return NextResponse.json({ error: "Write at least a few words first" }, { status: 400 });
  }

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
    return NextResponse.json({ suggestion: null, fallback: true });
  }

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey) return NextResponse.json({ suggestion: null, fallback: true });

  const ctx: BusinessContext = {
    name: business.name,
    industry: business.industry,
    description: business.description,
    services: business.services,
    city: business.city,
    website: business.website
  };

  try {
    const suggestion = await polishReviewDraft(cfg, ctx, text, business.id);
    return NextResponse.json({ suggestion });
  } catch (error) {
    if (error instanceof AiQuotaError) {
      return NextResponse.json({ suggestion: null, fallback: true, reason: error.reason });
    }
    return NextResponse.json({ suggestion: null, fallback: true });
  }
}

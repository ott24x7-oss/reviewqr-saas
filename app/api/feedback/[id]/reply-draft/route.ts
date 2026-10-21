import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { getAiConfig } from "@/lib/settings";
import { draftOwnerReplies, type BusinessContext } from "@/lib/ai";
import { AiQuotaError } from "@/lib/entitlements";
import { safePublicReply, safeWhatsappReply } from "@/lib/reply-draft";

/** Suggests a public reply and a private WhatsApp reply. Nothing is posted. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feedback = await prisma.feedback.findFirst({
    where: { id: params.id },
    include: {
      review: { select: { rating: true, customerPhone: true } },
      business: {
        select: {
          id: true,
          name: true,
          industry: true,
          description: true,
          services: true,
          city: true,
          website: true,
          aiReviewsEnabled: true
        }
      },
      tags: { include: { tag: { select: { name: true } } } }
    }
  });
  if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireBusinessRole(user.id, feedback.businessId, "manage");
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey || !feedback.business.aiReviewsEnabled) {
    return NextResponse.json({ error: "A reply draft isn't available right now." }, { status: 503 });
  }

  const ctx: BusinessContext = {
    name: feedback.business.name,
    industry: feedback.business.industry,
    description: feedback.business.description,
    services: feedback.business.services,
    city: feedback.business.city,
    website: feedback.business.website
  };

  try {
    const drafts = await draftOwnerReplies(
      cfg,
      ctx,
      {
        rating: feedback.review.rating,
        message: feedback.message,
        tags: feedback.tags.map((item) => item.tag.name)
      },
      feedback.business.id
    );
    return NextResponse.json({
      publicReply: safePublicReply(drafts.publicReply, feedback.message, feedback.review.customerPhone),
      whatsappReply: safeWhatsappReply(drafts.whatsappReply, feedback.review.customerPhone)
    });
  } catch (error) {
    if (error instanceof AiQuotaError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: "A reply draft isn't available right now." }, { status: 503 });
  }
}

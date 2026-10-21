import type { Feedback } from "@prisma/client";
import { feedbackPatchSchema } from "@reviewqr/shared";
import { logAudit } from "../admin";
import { prisma } from "../db";
import { AiQuotaError } from "../entitlements";
import { draftOwnerReplies, type BusinessContext } from "../ai";
import { cursorQuery, type PageQuery } from "../api/cursor";
import { takePage } from "../api/page";
import { fail, ok, type ServiceResult } from "../api/result";
import { safePublicReply, safeWhatsappReply } from "../reply-draft";
import { getAiConfig } from "../settings";
import { readableBusinessWhere, requireBusinessRole } from "../tenant";

const FEEDBACK_STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "IGNORED"] as const;

export async function listFeedback(
  userId: string,
  page: PageQuery,
  filter?: { status?: string | null; businessId?: string | null }
) {
  const status = filter?.status?.toUpperCase();
  if (status && !FEEDBACK_STATUSES.includes(status as (typeof FEEDBACK_STATUSES)[number])) {
    return fail(400, "Invalid status");
  }
  return takePage(
    () =>
      prisma.feedback.findMany({
        where: {
          business: {
            ...readableBusinessWhere(userId),
            ...(filter?.businessId ? { id: filter.businessId } : {})
          },
          ...(status ? { status: status as (typeof FEEDBACK_STATUSES)[number] } : {})
        },
        include: {
          review: {
            select: {
              rating: true,
              customerName: true,
              customerPhone: true,
              customerEmail: true,
              consentAt: true
            }
          },
          business: { select: { name: true, slug: true, whatsappNumber: true } },
          tags: { include: { tag: { select: { name: true, color: true } } } }
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...cursorQuery(page.cursorId, page.limit)
      }),
    page.limit
  );
}

type FeedbackPatchData = { ok: true; erased: true } | { feedback: Feedback };

export async function patchFeedback(
  userId: string,
  feedbackId: string,
  raw: unknown,
  ip: string
): Promise<ServiceResult<FeedbackPatchData>> {
  const feedback = await prisma.feedback.findFirst({ where: { id: feedbackId } });
  if (!feedback) return fail(404, "Not found");
  const access = await requireBusinessRole(userId, feedback.businessId, "manage");
  if (!access) return fail(404, "Not found");

  const parsed = feedbackPatchSchema.safeParse(raw);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message || "Invalid request");

  if (parsed.data.eraseContact) {
    await prisma.review.update({
      where: { id: feedback.reviewId },
      data: { customerName: null, customerEmail: null, customerPhone: null, consentAt: null }
    });
    await logAudit({
      userId,
      action: "feedback.erase_contact",
      entity: "Review",
      entityId: feedback.reviewId,
      ip
    });
    if (!parsed.data.status && parsed.data.internalNote === undefined) {
      return ok({ ok: true as const, erased: true as const });
    }
  }

  const updated = await prisma.feedback.update({
    where: { id: feedback.id },
    data: {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.internalNote !== undefined && { internalNote: parsed.data.internalNote }),
      ...(parsed.data.status === "RESOLVED" && {
        resolvedAt: new Date(),
        resolvedBy: userId
      })
    }
  });
  return ok({ feedback: updated });
}

/** Suggests a public reply and a private WhatsApp reply. Nothing is posted. */
export async function draftFeedbackReply(userId: string, feedbackId: string) {
  const feedback = await prisma.feedback.findFirst({
    where: { id: feedbackId },
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
  if (!feedback) return fail(404, "Not found");
  const access = await requireBusinessRole(userId, feedback.businessId, "manage");
  if (!access) return fail(404, "Not found");

  const cfg = await getAiConfig();
  if (!cfg.enabled || !cfg.apiKey || !feedback.business.aiReviewsEnabled) {
    return fail(503, "A reply draft isn't available right now.");
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
    return ok({
      publicReply: safePublicReply(drafts.publicReply, feedback.message, feedback.review.customerPhone),
      whatsappReply: safeWhatsappReply(drafts.whatsappReply, feedback.review.customerPhone)
    });
  } catch (error) {
    if (error instanceof AiQuotaError) return fail(429, error.message);
    return fail(503, "A reply draft isn't available right now.");
  }
}

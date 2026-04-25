import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reviewSubmitSchema } from "@/lib/validations";
import { rateLimit, verifyTurnstile } from "@/lib/rate-limit";
import { sanitizeFeedback, sanitizeText, isLikelyDuplicate } from "@/lib/sanitize";
import { fingerprint, getClientIp } from "@/lib/utils";
import { notifyNegativeFeedback } from "@/lib/notify";
import type { ReviewSentiment } from "@prisma/client";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent") || "";

  // Rate limit by IP — public endpoint, expect bots
  const rl = await rateLimit({ key: `pubreview:${ip}`, limit: 10, windowSeconds: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Optional Turnstile when submitting feedback (not pure rating-redirect)
  if (data.feedback && data.feedback.length > 0 && data.turnstileToken) {
    const verify = await verifyTurnstile(data.turnstileToken, ip);
    if (!verify.ok && !verify.skipped) {
      return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
    }
  }

  const business = await prisma.business.findUnique({
    where: { slug: data.businessSlug, isActive: true, archived: false }
  });
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const location = data.locationSlug
    ? await prisma.location.findUnique({
        where: { businessId_slug: { businessId: business.id, slug: data.locationSlug } }
      })
    : null;

  const staff = data.staffSlug
    ? await prisma.staff.findUnique({
        where: { businessId_slug: { businessId: business.id, slug: data.staffSlug } }
      })
    : null;

  const fp = fingerprint(ip, ua);

  // Duplicate detection — same fingerprint within last 10 mins
  if (data.feedback) {
    const recent = await prisma.review.findMany({
      where: {
        businessId: business.id,
        fingerprint: fp,
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
      },
      include: { feedback: true },
      take: 5
    });
    for (const r of recent) {
      if (r.feedback && isLikelyDuplicate(r.feedback.message, data.feedback)) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }
  }

  const sentiment: ReviewSentiment =
    data.rating >= 4 ? "POSITIVE" : data.rating === 3 ? "NEUTRAL" : "NEGATIVE";

  const cleanFeedback = data.feedback ? sanitizeFeedback(data.feedback) : "";
  const customerName = data.customerName ? sanitizeText(data.customerName, 80) : null;
  const customerEmail = data.customerEmail ? sanitizeText(data.customerEmail, 200) : null;
  const customerPhone = data.customerPhone ? sanitizeText(data.customerPhone, 20) : null;

  const redirected = data.rating >= business.ratingThreshold && !cleanFeedback;

  const review = await prisma.review.create({
    data: {
      businessId: business.id,
      locationId: location?.id || null,
      staffId: staff?.id || null,
      rating: data.rating,
      sentiment,
      redirected,
      source: data.source || "link",
      customerName,
      customerEmail,
      customerPhone,
      ipAddress: ip,
      userAgent: ua.slice(0, 500),
      fingerprint: fp
    }
  });

  // If feedback supplied, persist it
  if (cleanFeedback) {
    const feedback = await prisma.feedback.create({
      data: {
        reviewId: review.id,
        businessId: business.id,
        locationId: location?.id || null,
        staffId: staff?.id || null,
        message: cleanFeedback,
        npsScore: data.npsScore,
        status: "NEW"
      }
    });

    // Persist tags
    if (data.tags && data.tags.length) {
      for (const tagName of data.tags.slice(0, 10)) {
        const tag = await prisma.feedbackTag.upsert({
          where: { businessId_name: { businessId: business.id, name: tagName } },
          create: { businessId: business.id, name: tagName },
          update: {}
        });
        await prisma.feedbackTagOnFeedback.create({
          data: { feedbackId: feedback.id, tagId: tag.id }
        });
      }
    }

    // Notify owner on negative feedback (rating < threshold or any 1-3 stars)
    if (sentiment !== "POSITIVE") {
      notifyNegativeFeedback({
        businessId: business.id,
        reviewId: review.id,
        rating: data.rating,
        message: cleanFeedback,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined
      }).catch((e) => console.error("[notify]", e.message));
    }
  }

  return NextResponse.json({ ok: true, reviewId: review.id });
}

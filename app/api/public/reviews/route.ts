import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reviewSubmitSchema } from "@/lib/validations";
import { rateLimitDb, verifyTurnstile } from "@/lib/rate-limit";
import { sanitizeFeedback, sanitizeText, isLikelyDuplicate } from "@/lib/sanitize";
import { fingerprint, getClientIp } from "@/lib/utils";
import { notifyNegativeFeedback } from "@/lib/notify";
import { monthlyReviewCount, ownerLimitError } from "@/lib/entitlements";
import { reviewContact } from "@/lib/privacy";
import { reviewWasRedirected } from "@/lib/review-policy";
import type { ReviewSentiment } from "@prisma/client";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const ua = req.headers.get("user-agent") || "";

  // Rate limit by IP — public endpoint, expect bots
  const rl = await rateLimitDb({ key: `pubreview:${ip}`, limit: 10, windowSeconds: 60 });
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

  const verify = await verifyTurnstile(data.turnstileToken, ip);
  if (!verify.ok) {
    return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
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
  const contact = reviewContact({
    consent: data.consent === true,
    name: data.customerName ? sanitizeText(data.customerName, 80) : null,
    email: data.customerEmail ? sanitizeText(data.customerEmail, 200) : null,
    phone: data.customerPhone ? sanitizeText(data.customerPhone, 20) : null
  });
  const customerName = contact.customerName;
  const customerEmail = contact.customerEmail;
  const customerPhone = contact.customerPhone;
  const consentAt = contact.consented ? new Date() : null;

  const openedPublicReview = data.openedPublicReview === true;
  const redirectedNow = reviewWasRedirected({
    reviewGating: business.reviewGating,
    rating: data.rating,
    ratingThreshold: business.ratingThreshold,
    hasFeedback: !!cleanFeedback,
    openedPublicReview
  });

  // Reuse the recent row for this visitor and star rating. A later public-link
  // click marks it redirected. Written feedback attaches to the same row.
  const recent = await prisma.review.findFirst({
    where: {
      businessId: business.id,
      fingerprint: fp,
      rating: data.rating,
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) }
    },
    include: { feedback: true },
    orderBy: { createdAt: "desc" }
  });

  if (recent && !cleanFeedback) {
    if (redirectedNow && !recent.redirected) {
      await prisma.review.update({
        where: { id: recent.id },
        data: { redirected: true }
      });
    }
    return NextResponse.json({ ok: true, reviewId: recent.id });
  }

  const redirected = !!(recent?.redirected || redirectedNow);

  let review;
  if (recent && !recent.feedback) {
    review = await prisma.review.update({
      where: { id: recent.id },
      data: {
        locationId: location?.id ?? recent.locationId,
        staffId: staff?.id ?? recent.staffId,
        sentiment,
        redirected,
        source: data.source || recent.source,
        customerName,
        customerEmail,
        customerPhone,
        consentAt
      }
    });
  } else {
    const owner = await prisma.user.findUnique({
      where: { id: business.ownerId },
      select: {
        id: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        subscriptionEndsAt: true
      }
    });
    if (owner) {
      const used = await monthlyReviewCount(owner.id);
      const limitError = await ownerLimitError(owner, "reviews", used);
      if (limitError) {
        return NextResponse.json({ error: limitError }, { status: 402 });
      }
    }
    review = await prisma.review.create({
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
        consentAt,
        ipAddress: ip,
        userAgent: ua.slice(0, 500),
        fingerprint: fp
      }
    });
  }

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

    // Notify the owner when the rating is not positive (1–3 stars).
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

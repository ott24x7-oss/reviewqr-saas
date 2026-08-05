import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

async function getOwnedBusiness(id: string, userId: string) {
  return prisma.business.findFirst({
    where: { id, ownerId: userId, archived: false },
    select: { id: true }
  });
}

const manualSchema = z.object({
  authorName: z.string().trim().min(1).max(120).optional(),
  rating: z.coerce.number().int().optional(),
  message: z.string().optional(),
  reviewId: z.string().optional()
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const biz = await getOwnedBusiness(params.id, user.id);
  if (!biz) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = manualSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  // Promote from an existing review
  if (parsed.data.reviewId) {
    const review = await prisma.review.findFirst({
      where: { id: parsed.data.reviewId, businessId: biz.id },
      include: { feedback: true }
    });
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    const message = review.feedback?.message || "";
    if (!message.trim()) {
      return NextResponse.json(
        { error: "That review has no written feedback to publish" },
        { status: 400 }
      );
    }
    const testimonial = await prisma.testimonial.create({
      data: {
        businessId: biz.id,
        authorName: review.customerName || "Customer",
        rating: review.rating,
        message,
        isApproved: true,
        isPublic: true,
        source: "from_review"
      }
    });
    return NextResponse.json({ testimonial }, { status: 201 });
  }

  // Manual entry
  const authorName = (parsed.data.authorName || "").trim();
  const message = (parsed.data.message || "").trim();
  if (!authorName) {
    return NextResponse.json({ error: "Author name is required" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  const rating = Math.max(1, Math.min(5, Math.round(parsed.data.rating ?? 5)));

  const testimonial = await prisma.testimonial.create({
    data: {
      businessId: biz.id,
      authorName,
      rating,
      message,
      isApproved: true,
      isPublic: true,
      source: "manual"
    }
  });
  return NextResponse.json({ testimonial }, { status: 201 });
}

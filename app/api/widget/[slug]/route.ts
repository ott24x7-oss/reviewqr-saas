import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      name: true,
      logo: true,
      primaryColor: true,
      slug: true,
      isActive: true
    }
  });
  if (!business || !business.isActive) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [agg, testimonials] = await Promise.all([
    prisma.review.aggregate({
      where: { businessId: business.id, rating: { gte: 4 } },
      _avg: { rating: true },
      _count: true
    }),
    prisma.testimonial.findMany({
      where: { businessId: business.id, isApproved: true, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  const payload = {
    business: {
      name: business.name,
      logo: business.logo,
      primaryColor: business.primaryColor,
      slug: business.slug
    },
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
    total: agg._count,
    reviews: testimonials.map((t) => ({
      rating: t.rating,
      message: t.message.slice(0, 280),
      author: t.authorName,
      date: t.createdAt
    }))
  };

  return NextResponse.json(payload, {
    headers: {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300, s-maxage=300"
    }
  });
}

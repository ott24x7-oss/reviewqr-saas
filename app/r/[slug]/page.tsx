import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewFlow } from "./review-flow";
import { getBrand } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, logo: true, coverImage: true }
  });
  if (!business) return { title: "Review" };
  const ogImage = business.coverImage || business.logo || undefined;
  return {
    title: `Review ${business.name}`,
    description: business.description || `Share your experience at ${business.name}`,
    openGraph: {
      title: business.name,
      description: business.description || `Share your experience at ${business.name}`,
      images: ogImage && ogImage.startsWith("http") ? [ogImage] : undefined
    },
    robots: { index: false }
  };
}

export default async function ReviewPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: { l?: string; s?: string; q?: string };
}) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug, isActive: true, archived: false },
    include: {
      locations: { where: { isActive: true } },
      staffMembers: { where: { isActive: true } }
    }
  });
  if (!business) return notFound();

  const location = searchParams.l
    ? business.locations.find((l) => l.slug === searchParams.l)
    : null;

  const staff = searchParams.s
    ? business.staffMembers.find((s) => s.slug === searchParams.s)
    : null;

  if (searchParams.q) {
    prisma.qRCode
      .updateMany({
        where: { shortCode: searchParams.q, businessId: business.id },
        data: { scans: { increment: 1 } }
      })
      .catch(() => {});
  }

  // Public stats — drives the rating header
  const [stats, testimonialRows, recentPositive] = await Promise.all([
    prisma.review.aggregate({
      where: { businessId: business.id },
      _avg: { rating: true },
      _count: { _all: true }
    }),
    prisma.testimonial.findMany({
      where: { businessId: business.id, isPublic: true, isApproved: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        authorName: true,
        authorRole: true,
        authorImage: true,
        rating: true,
        message: true,
        createdAt: true
      }
    }),
    prisma.review.findMany({
      where: {
        businessId: business.id,
        rating: { gte: 4 },
        createdAt: { gte: new Date(Date.now() - 180 * 86400_000) }
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        rating: true,
        customerName: true,
        createdAt: true,
        feedback: { select: { message: true } }
      }
    })
  ]);

  const brand = await getBrand();

  const reviews = [
    ...testimonialRows.map((t) => ({
      id: t.id,
      author: t.authorName || "Customer",
      authorRole: t.authorRole,
      authorImage: t.authorImage,
      rating: t.rating,
      message: t.message,
      createdAt: t.createdAt.toISOString()
    })),
    ...recentPositive
      .filter((r) => r.feedback?.message)
      .slice(0, 10)
      .map((r) => ({
        id: r.id,
        author: r.customerName || "Customer",
        authorRole: null as string | null,
        authorImage: null as string | null,
        rating: r.rating,
        message: r.feedback?.message || "",
        createdAt: r.createdAt.toISOString()
      }))
  ];

  return (
    <ReviewFlow
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        logo: business.logo,
        coverImage: business.coverImage,
        description: business.description,
        industry: business.industry,
        primaryColor: business.primaryColor,
        googleReviewUrl: location?.googleReviewUrl || business.googleReviewUrl,
        ratingThreshold: business.ratingThreshold,
        customThankYou: business.customThankYou,
        whatsappNumber: business.whatsappNumber,
        phone: business.phone,
        email: business.email,
        website: business.website,
        address: location?.address || business.address,
        city: location?.city || business.city,
        state: location?.state || business.state,
        pincode: location?.pincode || business.pincode
      }}
      location={location ? { id: location.id, name: location.name, slug: location.slug } : null}
      staff={staff ? { id: staff.id, name: staff.name, slug: staff.slug, photo: staff.photo } : null}
      qrCode={searchParams.q || null}
      stats={{
        avgRating: stats._avg.rating || 0,
        count: stats._count._all
      }}
      reviews={reviews}
      brand={brand}
    />
  );
}

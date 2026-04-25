import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ReviewFlow } from "./review-flow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const business = await prisma.business.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true }
  });
  if (!business) return { title: "Review" };
  return {
    title: `Leave a review for ${business.name}`,
    description: business.description || `Share your experience at ${business.name}`,
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

  // Track QR scan if from a QR code
  if (searchParams.q) {
    prisma.qRCode
      .updateMany({
        where: { shortCode: searchParams.q, businessId: business.id },
        data: { scans: { increment: 1 } }
      })
      .catch(() => {});
  }

  return (
    <ReviewFlow
      business={{
        id: business.id,
        name: business.name,
        slug: business.slug,
        logo: business.logo,
        description: business.description,
        primaryColor: business.primaryColor,
        googleReviewUrl: location?.googleReviewUrl || business.googleReviewUrl,
        ratingThreshold: business.ratingThreshold,
        customThankYou: business.customThankYou,
        whatsappNumber: business.whatsappNumber,
        city: location?.city || business.city
      }}
      location={location ? { id: location.id, name: location.name, slug: location.slug } : null}
      staff={staff ? { id: staff.id, name: staff.name, slug: staff.slug, photo: staff.photo } : null}
      qrCode={searchParams.q || null}
    />
  );
}

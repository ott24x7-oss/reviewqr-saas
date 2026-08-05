import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TestimonialsClient } from "./testimonials-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TestimonialsPage({
  params
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    select: { id: true, name: true, slug: true }
  });
  if (!business) notFound();

  const [testimonials, reviews] = await Promise.all([
    prisma.testimonial.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" }
    }),
    prisma.review.findMany({
      where: {
        businessId: business.id,
        rating: { gte: 4 },
        feedback: { isNot: null }
      },
      include: { feedback: true },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const eligibleReviews = reviews
    .filter((r) => (r.feedback?.message || "").trim().length > 0)
    .map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      message: r.feedback?.message || "",
      createdAt: r.createdAt.toISOString()
    }));

  const initialTestimonials = testimonials.map((t) => ({
    id: t.id,
    authorName: t.authorName,
    authorRole: t.authorRole,
    rating: t.rating,
    message: t.message,
    isPublic: t.isPublic,
    isApproved: t.isApproved,
    source: t.source,
    createdAt: t.createdAt.toISOString()
  }));

  return (
    <div className="space-y-5">
      <Link
        href={`/dashboard/businesses/${business.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {business.name}
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Testimonials</h1>
        <p className="text-sm text-muted-foreground">
          Publish your best reviews as testimonials, or add your own. Approved &amp; public
          testimonials appear in your embeddable review widget.
        </p>
      </div>

      <TestimonialsClient
        businessId={business.id}
        initialTestimonials={initialTestimonials}
        eligibleReviews={eligibleReviews}
      />
    </div>
  );
}

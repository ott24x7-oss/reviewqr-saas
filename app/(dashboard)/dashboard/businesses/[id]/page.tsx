import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/utils";
import { ExternalLink, QrCode, MapPin, Users, Edit3, Star, FileText, Sparkles } from "lucide-react";
import { getReviewUrl } from "@/lib/qr";
import { BusinessActions } from "./business-actions";

export const dynamic = "force-dynamic";

export default async function BusinessDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    include: {
      _count: {
        select: {
          reviews: true,
          locations: true,
          staffMembers: true,
          qrCodes: true,
          feedbacks: true,
          reviewTemplates: true
        }
      },
      reviews: { select: { rating: true, redirected: true }, take: 1000, orderBy: { createdAt: "desc" } }
    }
  });
  if (!business) notFound();

  const ratings = business.reviews.map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((a, c) => a + c, 0) / ratings.length : 0;
  const redirectedCount = business.reviews.filter((r) => r.redirected).length;
  const reviewUrl = getReviewUrl({ businessSlug: business.slug });

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {business.logo ? (
            <img src={business.logo} alt={business.name} className="h-12 w-12 rounded-xl object-cover" />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: business.primaryColor }}
            >
              {business.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-display truncate">{business.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {business.industry || "—"} · {business.city || "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <a href={absoluteUrl(`/r/${business.slug}`)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> View page
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/businesses/${business.id}/edit`}>
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Reviews</div>
          <div className="text-2xl font-bold mt-0.5">{business._count.reviews}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Avg rating</div>
          <div className="text-2xl font-bold mt-0.5 inline-flex items-center gap-1">
            {avg > 0 ? avg.toFixed(1) : "—"}
            {avg > 0 && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">To Google</div>
          <div className="text-2xl font-bold mt-0.5 text-accent-600">{redirectedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Open feedback</div>
          <div className="text-2xl font-bold mt-0.5">{business._count.feedbacks}</div>
        </Card>
      </div>

      {/* Quick actions */}
      <BusinessActions business={business} reviewUrl={reviewUrl} />

      {/* Sub-resources nav */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href={`/dashboard/businesses/${business.id}/locations`}>
          <Card className="hover:shadow-card transition cursor-pointer">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">Locations</div>
                <div className="text-xs text-muted-foreground">{business._count.locations} added</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/businesses/${business.id}/staff`}>
          <Card className="hover:shadow-card transition cursor-pointer">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">Staff</div>
                <div className="text-xs text-muted-foreground">{business._count.staffMembers} added</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/businesses/${business.id}/qr`}>
          <Card className="hover:shadow-card transition cursor-pointer">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300">
                <QrCode className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">QR codes</div>
                <div className="text-xs text-muted-foreground">{business._count.qrCodes} active</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/dashboard/businesses/${business.id}/review-templates`}>
          <Card className="hover:shadow-card transition cursor-pointer">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">Review templates</div>
                <div className="text-xs text-muted-foreground">
                  {business._count.reviewTemplates} in stock
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/dashboard/businesses/${business.id}/ai`}>
          <Card className="hover:shadow-card transition cursor-pointer">
            <CardContent className="p-5 flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <div className="font-semibold">AI Reviews</div>
                <div className="text-xs text-muted-foreground">
                  Smart questions + review suggestions
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

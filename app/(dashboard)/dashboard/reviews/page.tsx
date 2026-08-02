import Link from "next/link";
import { Star, ArrowUpRight, Download, MessageSquare } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  searchParams
}: {
  searchParams: { rating?: string; business?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    select: { id: true, name: true, slug: true }
  });
  const businessIds = businesses.map((b) => b.id);

  const filterRating = searchParams.rating ? Number(searchParams.rating) : undefined;
  const filterBusiness = searchParams.business || undefined;

  const reviews = await prisma.review.findMany({
    where: {
      businessId: filterBusiness ? filterBusiness : { in: businessIds },
      ...(filterRating && { rating: filterRating })
    },
    include: {
      business: { select: { name: true, slug: true } },
      location: { select: { name: true } },
      staff: { select: { name: true } },
      feedback: { select: { message: true, status: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Every rating, every customer, real-time
          </p>
        </div>
        {filterBusiness && (
          <Button asChild variant="outline" size="sm">
            <a href={`/api/export/reviews?businessId=${filterBusiness}`}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </a>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-muted-foreground shrink-0">Rating:</span>
            <FilterPill href={`/dashboard/reviews${filterBusiness ? `?business=${filterBusiness}` : ""}`} active={!filterRating}>
              All
            </FilterPill>
            {[5, 4, 3, 2, 1].map((r) => (
              <FilterPill
                key={r}
                href={`/dashboard/reviews?rating=${r}${filterBusiness ? `&business=${filterBusiness}` : ""}`}
                active={filterRating === r}
              >
                {r}★
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:ml-auto">
            <span className="text-xs text-muted-foreground shrink-0">Business:</span>
            <FilterPill href={`/dashboard/reviews${filterRating ? `?rating=${filterRating}` : ""}`} active={!filterBusiness}>
              All
            </FilterPill>
            {businesses.map((b) => (
              <FilterPill
                key={b.id}
                href={`/dashboard/reviews?business=${b.id}${filterRating ? `&rating=${filterRating}` : ""}`}
                active={filterBusiness === b.id}
              >
                {b.name}
              </FilterPill>
            ))}
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No reviews yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Share your QR code to start collecting reviews.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="flex sm:flex-col sm:items-center gap-2 sm:gap-1 sm:w-20 shrink-0">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                      r.rating >= 4
                        ? "bg-accent-100 text-accent-700"
                        : r.rating === 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.rating}★
                  </div>
                  <span className="text-xs text-muted-foreground sm:text-center">{timeAgo(r.createdAt)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{r.customerName || "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{r.business.name}</span>
                    {r.location && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.location.name}
                      </Badge>
                    )}
                    {r.staff && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.staff.name}
                      </Badge>
                    )}
                    {r.redirected && (
                      <Badge variant="success" className="text-[10px]">
                        <ArrowUpRight className="h-2.5 w-2.5" /> Google
                      </Badge>
                    )}
                  </div>
                  {r.feedback?.message && (
                    <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{r.feedback.message}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {r.customerPhone && <span>📱 {r.customerPhone}</span>}
                    {r.customerEmail && <span>✉️ {r.customerEmail}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      {children}
    </Link>
  );
}

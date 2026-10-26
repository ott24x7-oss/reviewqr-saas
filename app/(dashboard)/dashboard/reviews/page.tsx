import Link from "next/link";
import { Star, ArrowUpRight, Download, MessageSquare, Phone, Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";
import { ownedOrAssignedWhere } from "@/lib/tenant";
import { LoadMore, shownCount } from "@/components/dashboard/load-more";
import { AppText } from "@/components/app-ui/i18n";
import { KpiCard, RelativeTime, EmptyState } from "@/components/app-ui/primitives";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({
  searchParams
}: {
  searchParams: { rating?: string; business?: string; show?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: ownedOrAssignedWhere(user.id),
    select: { id: true, name: true, slug: true }
  });
  const businessIds = businesses.map((b) => b.id);

  const filterRating = searchParams.rating ? Number(searchParams.rating) : undefined;
  const filterBusiness = searchParams.business || undefined;

  const shown = shownCount(searchParams.show);
  const rows = await prisma.review.findMany({
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
    take: shown + 1
  });
  const hasMore = rows.length > shown;
  const reviews = rows.slice(0, shown);
  const [summary, distribution] = await Promise.all([
    prisma.review.aggregate({ where: { businessId: filterBusiness ? filterBusiness : { in: businessIds }, ...(filterRating && { rating: filterRating }) }, _count: { id: true }, _avg: { rating: true } }),
    prisma.review.groupBy({ by: ["rating"], where: { businessId: filterBusiness ? filterBusiness : { in: businessIds } }, _count: { id: true } })
  ]);
  const distributions = new Map(distribution.map((row) => [row.rating, row._count.id]));
  const totalForDistribution = distribution.reduce((sum, row) => sum + row._count.id, 0);

  return (
    <div className="space-y-5">
      {filterBusiness ? <div className="flex justify-end"><Button asChild variant="outline" size="sm"><a href={`/api/export/reviews?businessId=${filterBusiness}`}><Download className="h-3.5 w-3.5" /><AppText en="Export CSV" hi="CSV निर्यात करें" /></a></Button></div> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label={<AppText en="Reviews" hi="रिव्यू" />} value={summary._count.id} delta={<AppText en="Matching this filter" hi="इस फ़िल्टर से मेल" />} />
          <KpiCard label={<AppText en="Average rating" hi="औसत रेटिंग" />} value={(summary._avg.rating || 0).toFixed(1)} delta={<AppText en="Out of 5 stars" hi="5 में से" />} />
        </div>
        <section className="app-ui-panel p-4 sm:p-5" aria-label="Rating breakdown">
          <h2 className="mb-3 text-sm font-semibold"><AppText en="Rating breakdown" hi="रेटिंग का ब्योरा" /></h2>
          <div className="space-y-2">{[5, 4, 3, 2, 1].map((rating) => {
            const count = distributions.get(rating) || 0;
            const percent = totalForDistribution ? Math.round(count / totalForDistribution * 100) : 0;
            return <div className="flex items-center gap-3 text-sm" key={rating}><span className="w-8 shrink-0 tabular-nums">{rating}★</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></span><span className="w-8 text-right text-xs text-muted-foreground tabular-nums">{count}</span></div>;
          })}</div>
        </section>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-muted-foreground shrink-0"><AppText en="Rating" hi="रेटिंग" />:</span>
            <FilterPill href={`/dashboard/reputation/reviews${filterBusiness ? `?business=${filterBusiness}` : ""}`} active={!filterRating}>
              <AppText en="All" hi="सभी" />
            </FilterPill>
            {[5, 4, 3, 2, 1].map((r) => (
              <FilterPill
                key={r}
                href={`/dashboard/reputation/reviews?rating=${r}${filterBusiness ? `&business=${filterBusiness}` : ""}`}
                active={filterRating === r}
              >
                {r}★
              </FilterPill>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar sm:ml-auto">
            <span className="text-xs text-muted-foreground shrink-0"><AppText en="Business" hi="कारोबार" />:</span>
            <FilterPill href={`/dashboard/reputation/reviews${filterRating ? `?rating=${filterRating}` : ""}`} active={!filterBusiness}>
              <AppText en="All" hi="सभी" />
            </FilterPill>
            {businesses.map((b) => (
              <FilterPill
                key={b.id}
                href={`/dashboard/reputation/reviews?business=${b.id}${filterRating ? `&rating=${filterRating}` : ""}`}
                active={filterBusiness === b.id}
              >
                {b.name}
              </FilterPill>
            ))}
          </div>
        </CardContent>
      </Card>

      {reviews.length === 0 ? (
        <div className="app-ui-panel"><EmptyState icon={<Star className="h-5 w-5" />} title={<AppText en={filterRating ? `No ${filterRating}-star reviews` : "No reviews yet"} hi={filterRating ? `${filterRating} स्टार का रिव्यू नहीं` : "अभी कोई रिव्यू नहीं"} />} description={<AppText en="Share your QR code to start collecting reviews." hi="रिव्यू पाना शुरू करने के लिए अपना QR कोड साझा करें।" />} /></div>
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
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                    }`}
                  >
                    {r.rating}★
                  </div>
                  <span className="text-xs text-muted-foreground sm:text-center"><RelativeTime date={r.createdAt} /></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{r.customerName || <AppText en="Anonymous" hi="अनाम" />}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{r.business.name}</span>
                    {r.location && (
                      <Badge variant="outline" className="text-xs">
                        {r.location.name}
                      </Badge>
                    )}
                    {r.staff && (
                      <Badge variant="outline" className="text-xs">
                        {r.staff.name}
                      </Badge>
                    )}
                    {r.redirected && (
                        <Badge variant="success" className="text-xs">
                        <ArrowUpRight className="h-2.5 w-2.5" /> <AppText en="Sent to Google" hi="Google पर भेजा" />
                      </Badge>
                    )}
                  </div>
                  {r.feedback?.message && (
                    <p className="mt-1.5 text-sm text-foreground/90 leading-relaxed">{r.feedback.message}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {r.customerPhone && (
                      <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" aria-hidden="true" /> {r.customerPhone}</span>
                    )}
                    {r.customerEmail && (
                      <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {r.customerEmail}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {hasMore && <LoadMore basePath="/dashboard/reputation/reviews" params={searchParams} shown={shown} />}
        </div>
      )}
    </div>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 shrink-0 items-center px-4 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      {children}
    </Link>
  );
}

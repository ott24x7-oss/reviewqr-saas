import Link from "next/link";
import { ArrowUpRight, Building2, MessageSquare, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    select: { id: true }
  });
  const businessIds = businesses.map((b) => b.id);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalReviews, monthReviews, agg, monthAgg, redirected, negativeCount, recentReviews, distribution] =
    await Promise.all([
      prisma.review.count({ where: { businessId: { in: businessIds } } }),
      prisma.review.count({
        where: { businessId: { in: businessIds }, createdAt: { gte: since } }
      }),
      prisma.review.aggregate({
        where: { businessId: { in: businessIds } },
        _avg: { rating: true }
      }),
      prisma.review.aggregate({
        where: { businessId: { in: businessIds }, createdAt: { gte: since } },
        _avg: { rating: true }
      }),
      prisma.review.count({
        where: { businessId: { in: businessIds }, redirected: true, createdAt: { gte: since } }
      }),
      prisma.feedback.count({
        where: { businessId: { in: businessIds }, status: "NEW" }
      }),
      prisma.review.findMany({
        where: { businessId: { in: businessIds } },
        include: {
          business: { select: { name: true, slug: true } },
          feedback: { select: { message: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { businessId: { in: businessIds } },
        _count: true
      })
    ]);

  const avgRating = agg._avg.rating || 0;
  const monthAvgRating = monthAgg._avg.rating || 0;
  const distMap = Object.fromEntries(distribution.map((d) => [d.rating, d._count]));
  const distArr = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: distMap[s] || 0 }));
  const distTotal = distArr.reduce((a, b) => a + b.count, 0);

  if (businesses.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Last 30 days · {businesses.length} business{businesses.length === 1 ? "" : "es"}
          </p>
        </div>
        <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
          <Link href="/dashboard/businesses/new">
            <Building2 className="h-4 w-4" /> New business
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          icon={Star}
          tone="primary"
          label="Total reviews"
          value={formatNumber(totalReviews)}
          sub={`+${formatNumber(monthReviews)} this month`}
        />
        <Stat
          icon={TrendingUp}
          tone="accent"
          label="Avg rating"
          value={avgRating.toFixed(1)}
          suffix=" / 5"
          sub={`${monthAvgRating.toFixed(1)} this month`}
        />
        <Stat
          icon={ArrowUpRight}
          tone="accent"
          label="Sent to Google"
          value={formatNumber(redirected)}
          sub="last 30 days"
        />
        <Stat
          icon={AlertTriangle}
          tone={negativeCount > 0 ? "warning" : "primary"}
          label="Open feedback"
          value={formatNumber(negativeCount)}
          sub={negativeCount > 0 ? "needs attention" : "all clear"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Rating distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {distArr.map((d) => {
              const pct = distTotal ? Math.round((d.count / distTotal) * 100) : 0;
              return (
                <div key={d.stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 w-12 shrink-0">
                    <span className="text-sm font-medium">{d.stars}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-elevated overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        d.stars >= 4 ? "bg-accent" : d.stars === 3 ? "bg-amber-400" : "bg-destructive"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {recentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No reviews yet. Share your QR code to get started.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentReviews.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        r.rating >= 4
                          ? "bg-accent/15 text-accent"
                          : r.rating === 3
                          ? "bg-amber-400/15 text-amber-400"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {r.rating}★
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">
                          {r.customerName || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">{timeAgo(r.createdAt)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.business.name}
                        {r.redirected && <span className="ml-1 text-accent">· sent to Google</span>}
                      </div>
                      {r.feedback?.message && (
                        <div className="mt-1 text-sm text-foreground/80 line-clamp-2">{r.feedback.message}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  label,
  value,
  suffix,
  sub
}: {
  icon: any;
  tone: "primary" | "accent" | "warning";
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
}) {
  const map: Record<string, string> = {
    primary: "bg-brand/15 text-brand",
    accent: "bg-accent/15 text-accent",
    warning: "bg-amber-400/15 text-amber-400"
  };
  return (
    <Card className="neu p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg ${map[tone]}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className="mt-3 sm:mt-4">
        <div className="text-xs sm:text-sm text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-xl sm:text-2xl font-bold">
          {value}
          {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
        </div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 sm:py-20">
      <div className="h-20 w-20 rounded-2xl gradient-brand flex items-center justify-center mb-5 shadow-glow">
        <Building2 className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold font-display">Welcome to ReviewQR!</h2>
      <p className="mt-2 text-muted-foreground max-w-md">
        Add your first business to get a smart review link, generate QR codes, and start collecting Google reviews.
      </p>
      <Button asChild variant="gradient" size="lg" className="mt-6">
        <Link href="/dashboard/businesses/new">
          <Building2 className="h-4 w-4" /> Add your first business
        </Link>
      </Button>
    </div>
  );
}

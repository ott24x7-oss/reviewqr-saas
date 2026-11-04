import Link from "next/link";
import { Building2, ExternalLink, LockKeyhole, Plus, Star, MessageSquare, MapPin, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { absoluteUrl, formatNumber } from "@/lib/utils";
import { ownedOrAssignedWhere } from "@/lib/tenant";
import { getBusinessLockedFeatureIds } from "@/lib/plans/dashboard-gate";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: ownedOrAssignedWhere(user.id),
    select: { id: true, ownerId: true, name: true, slug: true, logo: true, primaryColor: true, industry: true },
    orderBy: { createdAt: "desc" }
  });
  const ownerIds = Array.from(new Set(businesses.map((business) => business.ownerId)));
  const lockEntries = await Promise.all(ownerIds.map(async (ownerId) => [
    ownerId,
    new Set(await getBusinessLockedFeatureIds(ownerId, ["reviews-log", "multiple-qrs"]))
  ] as const));
  const lockedByOwner = new Map(lockEntries);
  const businessCards = await Promise.all(businesses.map(async (business) => {
    const locked = lockedByOwner.get(business.ownerId) || new Set();
    const [reviewStats, qrCount] = await Promise.all([
      locked.has("reviews-log")
        ? Promise.resolve(null)
        : prisma.review.aggregate({ where: { businessId: business.id }, _avg: { rating: true }, _count: { _all: true } }),
      locked.has("multiple-qrs")
        ? Promise.resolve(null)
        : prisma.qRCode.count({ where: { businessId: business.id } })
    ]);
    return {
      ...business,
      locked,
      averageRating: reviewStats?._avg.rating || 0,
      reviewCount: reviewStats?._count._all || 0,
      qrCount
    };
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Businesses</h1>
          <p className="text-sm text-muted-foreground">
            Manage all your businesses and locations
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/dashboard/businesses/new">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add</span> Business
          </Link>
        </Button>
      </div>

      {businesses.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No businesses yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first business to get started.
            </p>
            <Button asChild variant="gradient" className="mt-5">
              <Link href="/dashboard/businesses/new">
                <Plus className="h-4 w-4" /> Add Business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessCards.map((b) => {
            return (
              <Card key={b.id} className="hover:shadow-card transition-shadow flex flex-col">
                <CardContent className="p-5 flex-1">
                  <div className="flex items-start gap-3">
                    {b.logo ? (
                      <img src={b.logo} alt={b.name} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                        style={{ background: b.primaryColor }}
                      >
                        {b.name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold leading-tight truncate">{b.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {b.industry || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-secondary p-2">
                      <div className="text-base font-bold inline-flex items-center gap-0.5">
                        {b.locked.has("reviews-log") ? <LockKeyhole className="h-3.5 w-3.5" /> : b.averageRating > 0 ? b.averageRating.toFixed(1) : "—"}
                        {!b.locked.has("reviews-log") && b.averageRating > 0 && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                    <div className="rounded-lg bg-secondary p-2">
                      <div className="text-base font-bold">{b.locked.has("reviews-log") ? <LockKeyhole className="mx-auto h-3.5 w-3.5" /> : formatNumber(b.reviewCount)}</div>
                      <div className="text-xs text-muted-foreground">Reviews</div>
                    </div>
                    <div className="rounded-lg bg-secondary p-2">
                      <div className="text-base font-bold">{b.locked.has("multiple-qrs") || b.qrCount === null ? <LockKeyhole className="mx-auto h-3.5 w-3.5" /> : b.qrCount}</div>
                      <div className="text-xs text-muted-foreground">QR codes</div>
                    </div>
                  </div>
                </CardContent>
                <div className="px-5 pb-5 flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href={`/dashboard/businesses/${b.id}`}>Manage</Link>
                  </Button>
                  <Button asChild variant="outline" size="icon-sm" title="Open review page">
                    <a href={absoluteUrl(`/r/${b.slug}`)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Building2, ExternalLink, Plus, Star, MessageSquare, MapPin, QrCode } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { absoluteUrl, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BusinessesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    include: {
      _count: { select: { reviews: true, locations: true, qrCodes: true } },
      reviews: { select: { rating: true } }
    },
    orderBy: { createdAt: "desc" }
  });

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
          {businesses.map((b) => {
            const ratings = b.reviews.map((r) => r.rating);
            const avg = ratings.length ? ratings.reduce((a, c) => a + c, 0) / ratings.length : 0;
            return (
              <Card key={b.id} className="hover:shadow-neu transition-shadow flex flex-col">
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
                    <div className="rounded-lg bg-elevated p-2">
                      <div className="text-base font-bold inline-flex items-center gap-0.5">
                        {avg > 0 ? avg.toFixed(1) : "—"}
                        {avg > 0 && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Rating</div>
                    </div>
                    <div className="rounded-lg bg-elevated p-2">
                      <div className="text-base font-bold">{formatNumber(b._count.reviews)}</div>
                      <div className="text-[10px] text-muted-foreground">Reviews</div>
                    </div>
                    <div className="rounded-lg bg-elevated p-2">
                      <div className="text-base font-bold">{b._count.qrCodes}</div>
                      <div className="text-[10px] text-muted-foreground">QR codes</div>
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

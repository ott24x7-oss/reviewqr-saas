import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";
import { absoluteUrl, formatNumber, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage({
  searchParams
}: {
  searchParams: { q?: string; archived?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const showArchived = searchParams.archived === "1";

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } }
    ];
  }
  if (!showArchived) where.archived = false;

  const businesses = await prisma.business.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      owner: { select: { id: true, email: true, name: true, subscriptionTier: true } },
      _count: { select: { reviews: true, locations: true, qrCodes: true } }
    }
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Businesses</h1>
        <p className="text-sm text-muted-foreground">{businesses.length} shown</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search name, slug, city…"
                className="pl-9"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-white">
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={showArchived}
                className="rounded"
              />
              Show archived
            </label>
            <button className="h-10 px-4 rounded-lg bg-foreground text-white text-sm font-medium">
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4">Business</th>
                  <th className="text-left py-2.5 px-4">Owner</th>
                  <th className="text-left py-2.5 px-4">Reviews</th>
                  <th className="text-left py-2.5 px-4">Locations</th>
                  <th className="text-left py-2.5 px-4">QRs</th>
                  <th className="text-left py-2.5 px-4">Status</th>
                  <th className="text-left py-2.5 px-4">Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-secondary/40 last:border-0">
                    <td className="py-2.5 px-4">
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">/r/{b.slug}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/admin/users/${b.owner.id}`}
                        className="text-xs hover:underline"
                      >
                        {b.owner.email}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {b.owner.subscriptionTier}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">{formatNumber(b._count.reviews)}</td>
                    <td className="py-2.5 px-4">{b._count.locations}</td>
                    <td className="py-2.5 px-4">{b._count.qrCodes}</td>
                    <td className="py-2.5 px-4">
                      {b.archived ? (
                        <Badge variant="outline">archived</Badge>
                      ) : b.isActive ? (
                        <Badge variant="success">active</Badge>
                      ) : (
                        <Badge variant="warning">inactive</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">
                      {timeAgo(b.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
                      <a
                        href={absoluteUrl(`/r/${b.slug}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
                {businesses.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No businesses matched.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

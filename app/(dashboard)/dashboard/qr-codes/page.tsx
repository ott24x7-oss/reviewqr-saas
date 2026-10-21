import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { accessRole, allows, readableBusinessWhere } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
import { QrBoard } from "./qr-board";

export const dynamic = "force-dynamic";

export default async function QrCodesPage({
  searchParams
}: {
  searchParams: { status?: string; business?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const status = searchParams.status === "ACTIVE" || searchParams.status === "DISABLED" ? searchParams.status : "";
  const businessId = searchParams.business || "";
  const rows = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    include: {
      members: { where: { userId: user.id }, select: { role: true }, take: 1 },
      locations: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } },
      qrCodes: {
        include: { location: { select: { name: true } } },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  const businesses = rows.map((row) => ({
    id: row.id,
    name: row.name,
    canManage: allows(accessRole(row.ownerId, user.id, row.members[0]?.role, row.agentId), "manage"),
    locations: row.locations.map((location) => ({ id: location.id, name: location.name }))
  }));
  const items = rows.flatMap((row) => {
    if (businessId && row.id !== businessId) return [];
    return row.qrCodes
      .filter((qr) => !status || qr.status === status)
      .map((qr) => ({
        code: qr.shortCode,
        label: qr.label,
        status: qr.status,
        scans: qr.scans,
        businessId: row.id,
        businessName: row.name,
        locationId: qr.locationId,
        locationName: qr.location?.name || null
      }));
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display sm:text-3xl">QR codes</h1>
          <p className="text-sm text-muted-foreground">Activate, label, and download the codes for your businesses.</p>
        </div>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link href="/dashboard/activate">Activate a tag</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <Building2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Add a business first</h3>
            <p className="mt-1 text-sm text-muted-foreground">You need a business before you can generate QR codes.</p>
            <Button asChild variant="gradient" className="mt-5">
              <Link href="/dashboard/businesses/new">
                <Plus className="h-4 w-4" /> Add Business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <form className="flex flex-wrap gap-2" action="/dashboard/qr-codes">
            <select name="status" defaultValue={status} className="input min-h-[44px]" aria-label="Status">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
            <select name="business" defaultValue={businessId} className="input min-h-[44px]" aria-label="Business">
              <option value="">All businesses</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>{business.name}</option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="min-h-[44px]">Filter</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {businesses.filter((business) => business.canManage).map((business) => (
              <Button key={business.id} asChild size="sm" variant="outline" className="min-h-[44px]">
                <Link href={`/dashboard/businesses/${business.id}/qr`}>
                  <Plus className="h-3.5 w-3.5" /> New QR for {business.name}
                </Link>
              </Button>
            ))}
          </div>
          <QrBoard businesses={businesses} items={items} />
        </>
      )}
    </div>
  );
}

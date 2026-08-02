import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, QrCode } from "lucide-react";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QrCodesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    include: {
      qrCodes: {
        include: {
          location: { select: { name: true } },
          staff: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">QR codes</h1>
        <p className="text-sm text-muted-foreground">
          Generate, print, and track QR codes for counter / table / bills
        </p>
      </div>

      {businesses.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Add a business first</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You need a business before you can generate QR codes.
            </p>
            <Button asChild variant="gradient" className="mt-5">
              <Link href="/dashboard/businesses/new">
                <Plus className="h-4 w-4" /> Add Business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {businesses.map((b) => (
            <div key={b.id}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: b.primaryColor }}
                  >
                    {b.name[0]}
                  </div>
                  <h2 className="font-semibold">{b.name}</h2>
                  <Badge variant="secondary">{b.qrCodes.length} codes</Badge>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/businesses/${b.id}/qr`}>
                    <Plus className="h-3.5 w-3.5" /> New QR
                  </Link>
                </Button>
              </div>

              {b.qrCodes.length === 0 ? (
                <Card className="text-center py-10">
                  <CardContent>
                    <QrCode className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No QR codes yet for this business.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {b.qrCodes.map((qr) => (
                    <Card key={qr.id} className="hover:shadow-neu transition">
                      <CardContent className="p-4 text-center">
                        <div className="aspect-square bg-white rounded-lg border border-border flex items-center justify-center p-3">
                          <img
                            src={absoluteUrl(`/api/qr/${qr.shortCode}/image?format=svg`)}
                            alt={qr.label}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <h3 className="mt-3 font-medium text-sm truncate">{qr.label}</h3>
                        <p className="text-xs text-muted-foreground">{qr.scans} scans</p>
                        <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                          <Link href={`/dashboard/qr-codes/${qr.shortCode}`}>View</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

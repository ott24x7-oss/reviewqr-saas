import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { absoluteUrl } from "@/lib/utils";
import { QrCreateClient } from "./qr-create-client";

export const dynamic = "force-dynamic";

export default async function BusinessQrPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    include: {
      locations: { where: { isActive: true } },
      staffMembers: { where: { isActive: true } },
      qrCodes: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!business) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">QR codes</h1>
        <p className="text-sm text-muted-foreground">{business.name}</p>
      </div>

      <QrCreateClient
        businessId={business.id}
        locations={business.locations.map((l) => ({ id: l.id, name: l.name }))}
        staff={business.staffMembers.map((s) => ({ id: s.id, name: s.name }))}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {business.qrCodes.map((qr) => (
          <Card key={qr.id} className="hover:shadow-card transition">
            <CardContent className="p-4 text-center">
              <div className="aspect-square bg-white rounded-lg border flex items-center justify-center p-3">
                <img
                  src={absoluteUrl(`/api/qr/${qr.shortCode}/image?format=svg`)}
                  alt={qr.label}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="mt-3 font-medium text-sm truncate">{qr.label}</h3>
              <p className="text-xs text-muted-foreground">{qr.scans} scans</p>
              <Link
                href={`/dashboard/qr-codes/${qr.shortCode}`}
                className="mt-2 inline-block text-primary text-xs hover:underline"
              >
                View →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

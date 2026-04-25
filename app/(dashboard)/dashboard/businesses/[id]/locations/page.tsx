import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { LocationsClient } from "./locations-client";

export const dynamic = "force-dynamic";

export default async function LocationsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    include: { locations: { orderBy: { createdAt: "asc" } } }
  });
  if (!business) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Locations</h1>
        <p className="text-sm text-muted-foreground">{business.name}</p>
      </div>
      <LocationsClient
        businessId={business.id}
        businessSlug={business.slug}
        initial={business.locations.map((l) => ({
          id: l.id,
          name: l.name,
          slug: l.slug,
          city: l.city || "",
          isActive: l.isActive,
          googleReviewUrl: l.googleReviewUrl || ""
        }))}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { StaffClient } from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    include: {
      staffMembers: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { reviews: true } } }
      }
    }
  });
  if (!business) notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Staff</h1>
        <p className="text-sm text-muted-foreground">{business.name}</p>
      </div>
      <StaffClient
        businessId={business.id}
        businessSlug={business.slug}
        initial={business.staffMembers.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          role: s.role || "",
          reviewCount: s._count.reviews
        }))}
      />
    </div>
  );
}

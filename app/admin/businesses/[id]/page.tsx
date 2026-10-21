import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AdminBusinessForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function AdminBusinessPage({ params }: { params: { id: string } }) {
  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: { owner: { select: { email: true } } }
  });
  if (!business) notFound();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/businesses" className="text-xs text-muted-foreground hover:underline">
          Businesses
        </Link>
        <h1 className="text-2xl font-bold font-display">{business.name}</h1>
      </div>
      <AdminBusinessForm
        id={business.id}
        name={business.name}
        ownerEmail={business.owner.email}
        isActive={business.isActive}
        reviewGating={business.reviewGating}
        ratingThreshold={business.ratingThreshold}
      />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ReviewTemplatesClient } from "./templates-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ReviewTemplatesPage({
  params
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    select: { id: true, name: true, slug: true }
  });
  if (!business) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/dashboard/businesses/${business.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {business.name}
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Review templates</h1>
        <p className="text-sm text-muted-foreground">
          Pre-write positive review variants. After a happy customer rates 4–5 stars they'll see
          4 options to copy &amp; paste on Google. Each one is shown to a single customer only —
          so the reviews you actually receive on Google stay unique.
        </p>
      </div>

      <ReviewTemplatesClient businessId={business.id} businessName={business.name} />
    </div>
  );
}

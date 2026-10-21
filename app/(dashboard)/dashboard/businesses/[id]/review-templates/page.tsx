import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
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

  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) notFound();
  const business = await prisma.business.findFirst({
    where: { id: params.id, archived: false },
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
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Topic hints</h1>
        <p className="text-sm text-muted-foreground">
          Short topics a customer can tap to add to their own words. These are not reviews to
          copy. A hint of about 40 characters works best. Older notes stay saved and can still be tapped.
        </p>
      </div>

      <ReviewTemplatesClient businessId={business.id} businessName={business.name} />
    </div>
  );
}

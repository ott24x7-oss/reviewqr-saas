import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireBusinessRole } from "@/lib/tenant";
import { PrintEditor } from "@/app/admin/print/editor";
import { HelpLink } from "@/components/help/help-link";

export const dynamic = "force-dynamic";

export default async function BusinessPrintPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/dashboard/businesses/${params.id}/print`);
  const access = await requireBusinessRole(user.id, params.id, "manage");
  if (!access) notFound();
  const business = await prisma.business.findFirst({
    where: { id: params.id, archived: false },
    select: { id: true, name: true }
  });
  if (!business) notFound();
  return (
    <div className="space-y-3">
      <HelpLink context="print" page="Print studio" />
      <PrintEditor mode="tables" businessId={business.id} businessName={business.name} />
    </div>
  );
}

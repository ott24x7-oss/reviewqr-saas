import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui/primitives";
import { loadPlanBoardRows } from "@/lib/admin/plan-rows";
import { PlansBoard } from "../plans-board";

export const dynamic = "force-dynamic";

export default async function AdminPlanPage({ params }: { params: { id: string } }) {
  const plans = await loadPlanBoardRows(params.id);
  const plan = plans[0];
  if (!plan) notFound();
  return (
    <div className="space-y-5">
      <PageHeader title={plan.nameEn || "Plan"} subtitle={plan.slug} actions={<Link className="text-sm underline" href="/admin/plans">All plans</Link>} />
      <PlansBoard plans={plans} />
    </div>
  );
}

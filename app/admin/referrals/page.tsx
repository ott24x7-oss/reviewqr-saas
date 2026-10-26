import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { listAdminReferrals } from "@/lib/admin/directory";
import { adminSearchParams } from "@/lib/admin/web-search";
import { getPlanProgramSettings } from "@/lib/plans/settings";
import { RewardForm } from "./reward-form";
import { ReferralsTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const [settings, listed] = await Promise.all([getPlanProgramSettings(), listAdminReferrals(adminSearchParams(searchParams))]);
  return (
    <div className="space-y-5">
      <PageHeader title="Referrals" subtitle="Months are added to the referrer after the new business pays and the hold passes." />
      <RewardForm initial={settings} />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <ReferralsTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
    </div>
  );
}

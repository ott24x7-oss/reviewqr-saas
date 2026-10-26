import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { listAdminSubscriptions } from "@/lib/admin/directory";
import { adminSearchParams } from "@/lib/admin/web-search";
import { SubscriptionsTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const listed = await listAdminSubscriptions(adminSearchParams(searchParams));
  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Active, trial, expiring, and churned plans." />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <SubscriptionsTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
    </div>
  );
}

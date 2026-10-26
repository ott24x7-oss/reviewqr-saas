import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { listAdminAuditPage } from "@/lib/admin/audit-query";
import { adminSearchParams } from "@/lib/admin/web-search";
import { AuditTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const listed = await listAdminAuditPage(adminSearchParams(searchParams));
  return (
    <div>
      <PageHeader title="Audit log" subtitle="Filters, the reason, and the before and after of each change." />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <AuditTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
    </div>
  );
}

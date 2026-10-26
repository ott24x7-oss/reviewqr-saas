import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { listAdminCustomers } from "@/lib/admin/directory";
import { adminSearchParams } from "@/lib/admin/web-search";
import { CustomersTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  const listed = await listAdminCustomers(search);
  return (
    <div>
      <PageHeader title="Owners" subtitle="Every account. Phones stay masked in the list." />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <CustomersTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
    </div>
  );
}

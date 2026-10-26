import { Suspense } from "react";
import { PageHeader, TableSkeleton } from "@/components/admin/ui/primitives";
import { listAdminBusinesses } from "@/lib/admin/directory";
import { adminSearchParams } from "@/lib/admin/web-search";
import { BusinessesTable } from "./table";

export const dynamic = "force-dynamic";

export default async function AdminBusinessesPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  const listed = await listAdminBusinesses(search);
  return (
    <div>
      <PageHeader title="Businesses" subtitle="Tap pages, QR stock, and the owner behind each one." />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <BusinessesTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
    </div>
  );
}

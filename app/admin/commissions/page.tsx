import Link from "next/link";
import { PageHeader } from "@/components/admin/ui/primitives";
import { listLegacyCommissions, pageCommissionReport } from "@/lib/admin/money";
import { adminSearchParams } from "@/lib/admin/web-search";
import { formatINR } from "@/lib/utils";
import { LegacyActions } from "./legacy-actions";
import { PayButton } from "./pay-button";
import { CommissionsTable } from "./table";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/admin/ui/primitives";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage({ searchParams }: { searchParams?: Record<string, string | undefined> }) {
  const search = adminSearchParams(searchParams);
  const [listed, legacy] = await Promise.all([pageCommissionReport(search), listLegacyCommissions(search)]);
  const legacyPage = legacy.ok ? legacy.data.page : 1;
  const nextLegacy = legacy.ok && legacy.data.page * legacy.data.pageSize < legacy.data.total ? legacy.data.page + 1 : null;
  return (
    <div className="space-y-5">
      <PageHeader
        title="Commissions & payouts"
        subtitle="Sales and commission due. Marking a payout paid asks for a WhatsApp code."
        actions={
          <Link href="/api/admin/commissions/export" className="text-sm font-medium underline">
            Download CSV
          </Link>
        }
      />
      {!listed.ok ? <p className="text-sm text-rose-600">{listed.error}</p> : (
        <Suspense fallback={<TableSkeleton />}>
          <CommissionsTable rows={listed.data.items} total={listed.data.total} page={listed.data.page} pageSize={listed.data.pageSize} />
        </Suspense>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Unsettled history</h2>
        <p className="text-sm text-zinc-500">Commissions from before this ledger. They are not payable until you approve one or mark it as already paid.</p>
        {!legacy.ok || legacy.data.items.length === 0 ? (
          <p className="text-sm text-zinc-500">None waiting.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="py-2 pr-3">Agent</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2">Decision</th>
              </tr>
            </thead>
            <tbody>
              {legacy.data.items.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 pr-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-zinc-500">{row.phone || row.email}</div>
                  </td>
                  <td className="py-3 pr-3">{formatINR(row.amountPaise)}</td>
                  <td className="py-3"><LegacyActions id={row.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {nextLegacy ? <Link className="text-sm underline" href={`/admin/commissions?legacyPage=${nextLegacy}&page=${legacyPage}`}>Next unsettled page</Link> : null}
      </section>
    </div>
  );
}

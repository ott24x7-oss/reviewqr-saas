import Link from "next/link";
import { commissionReportRows, legacyCommissionRows } from "@/lib/plans/payout";
import { formatINR } from "@/lib/utils";
import { LegacyActions } from "./legacy-actions";
import { PayButton } from "./pay-button";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  const [rows, legacy] = await Promise.all([commissionReportRows(), legacyCommissionRows()]);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Commissions</h1>
          <p className="text-sm text-muted-foreground">Sales and commission due. Pay records every approved entry for that agent.</p>
        </div>
        <Link href="/api/admin/commissions/export" className="text-sm font-medium underline">
          Download CSV
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3">Agent</th>
              <th className="py-2 pr-3">Sales</th>
              <th className="py-2 pr-3">Pending</th>
              <th className="py-2 pr-3">Approved</th>
              <th className="py-2 pr-3">Paid</th>
              <th className="py-2 pr-3">Unsettled history</th>
              <th className="py-2">Payout</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.agentId} className="border-b">
                <td className="py-3 pr-3">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.phone}</div>
                </td>
                <td className="py-3 pr-3">
                  {formatINR(row.salesPaise)}
                  <div className="text-xs text-muted-foreground">{row.salesCount} payments</div>
                </td>
                <td className="py-3 pr-3">{formatINR(row.pendingPaise)}</td>
                <td className="py-3 pr-3">{formatINR(row.approvedPaise)}</td>
                <td className="py-3 pr-3">{formatINR(row.paidPaise)}</td>
                <td className="py-3 pr-3">{formatINR(row.legacyPaise)}</td>
                <td className="py-3">
                  <PayButton agentId={row.agentId} disabled={row.approvedPaise <= 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold">Unsettled history</h2>
        <p className="text-sm text-muted-foreground">
          Commissions from before this ledger. They are not payable until you approve one or mark it as already paid.
        </p>
        {legacy.length === 0 ? (
          <p className="text-sm text-muted-foreground">None waiting.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Agent</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2">Decision</th>
                </tr>
              </thead>
              <tbody>
                {legacy.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-3 pr-3">
                      <div className="font-medium">{row.agent.name || "Agent"}</div>
                      <div className="text-xs text-muted-foreground">{row.agent.phone || row.agent.email}</div>
                    </td>
                    <td className="py-3 pr-3">{formatINR(row.amountPaise)}</td>
                    <td className="py-3">
                      <LegacyActions id={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

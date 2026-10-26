import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentPayouts } from "@/lib/plans/agent-team";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AgentPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const payouts = await loadAgentPayouts(user.id);
  const items = payouts.ok ? payouts.data.items : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Payouts</h1>
        <Link href="/api/agent/statement" className="text-sm underline">
          Download CSV
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">Each row is the gross commission, the TDS kept for the year, and the net that was sent.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3">Paid</th>
              <th className="py-2 pr-3">Gross</th>
              <th className="py-2 pr-3">TDS</th>
              <th className="py-2 pr-3">Net</th>
              <th className="py-2">UTR</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="py-3 text-muted-foreground" colSpan={5}>
                  No payouts yet.
                </td>
              </tr>
            ) : null}
            {items.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2 pr-3">{formatDate(row.paidAt)}</td>
                <td className="py-2 pr-3">{formatINR(row.grossPaise)}</td>
                <td className="py-2 pr-3">{formatINR(row.tdsPaise)}</td>
                <td className="py-2 pr-3">{formatINR(row.netPaise)}</td>
                <td className="py-2">{row.utr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

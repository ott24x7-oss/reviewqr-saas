import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadAgentCommissions, loadAgentEarningsTotals } from "@/lib/plans/agent-team";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AgentEarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [ledger, totals] = await Promise.all([loadAgentCommissions(user.id, null, 100), loadAgentEarningsTotals(user.id)]);
  const items = ledger.ok ? ledger.data.items : [];
  const own = items.filter((item) => item.kind !== "TEAM_OVERRIDE");
  const team = items.filter((item) => item.kind === "TEAM_OVERRIDE");
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Earnings</h1>
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">My sales</p>
          <p className="text-2xl font-bold">{formatINR(totals.ownPaise)}</p>
        </article>
        <article className="rounded-xl border p-4">
          <p className="text-xs text-muted-foreground">Team override</p>
          <p className="text-2xl font-bold">{formatINR(totals.teamPaise)}</p>
        </article>
      </section>
      <CommissionList title="My sales" rows={own} />
      <CommissionList title="Team override" rows={team} />
    </div>
  );
}

function CommissionList({
  title,
  rows
}: {
  title: string;
  rows: Array<{ id: string; kind: string; amountPaise: number; businessName: string; fromAgentName?: string; status: string; createdAt: string }>;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? <li className="text-sm text-muted-foreground">Nothing here yet.</li> : null}
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">
              {row.businessName}
              {row.fromAgentName ? ` · from ${row.fromAgentName}` : ""}
            </p>
            <p className="text-muted-foreground">
              {row.kind} · {formatINR(row.amountPaise)} · {row.status} · {formatDate(row.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

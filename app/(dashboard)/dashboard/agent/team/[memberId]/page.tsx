import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loadTeamMember } from "@/lib/plans/agent-team";
import { formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AgentMemberPage({ params }: { params: { memberId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const member = await loadTeamMember(user.id, params.memberId);
  if (!member.ok) notFound();
  return (
    <div className="space-y-4">
      <Link href="/dashboard/agent/team" className="text-sm text-muted-foreground">
        Back to team
      </Link>
      <h1 className="font-display text-2xl font-bold">{member.data.name}</h1>
      <p className="text-sm text-muted-foreground">
        {member.data.phoneMasked} · {member.data.status}
        {member.data.sharePercent != null ? ` · ${member.data.sharePercent}% of the pool` : ""}
      </p>
      <p className="text-sm">
        This month {formatINR(member.data.monthSalesPaise)} in sales commission and {formatINR(member.data.monthOverridePaise)} override across {member.data.businesses} businesses.
      </p>
      <h2 className="font-display text-xl font-bold">Recent sales</h2>
      <ul className="space-y-2">
        {member.data.sales.length === 0 ? <li className="text-sm text-muted-foreground">No sales yet.</li> : null}
        {member.data.sales.map((sale) => (
          <li key={sale.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">{sale.businessName}</p>
            <p className="text-muted-foreground">
              {sale.kind} · {formatINR(sale.amountPaise)} · {sale.status} · {formatDate(sale.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

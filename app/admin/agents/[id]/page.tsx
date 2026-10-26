import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailLayout, MetaCard } from "@/components/admin/ui/detail";
import { PageHeader, StatusBadge } from "@/components/admin/ui/primitives";
import { loadAdminAgent } from "@/lib/admin/team-admin";
import { AgentActions } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminAgentPage({ params }: { params: { id: string } }) {
  const agent = await loadAdminAgent(params.id);
  if (!agent.ok) notFound();
  const row = agent.data;
  return (
    <div>
      <PageHeader title={row.name} subtitle={row.code} actions={<Link className="text-sm underline" href="/admin/agents">All agents</Link>} />
      <DetailLayout
        main={
          <div className="space-y-4">
            <StatusBadge value={row.status} />
            <p className="text-sm text-zinc-500">Phone {row.phone || "—"} · {row.email || "No email"}</p>
            <AgentActions id={row.id} />
            <p className="text-sm text-zinc-500">
              Team depth, TDS, and the leaderboard stay on the <Link className="underline" href="/admin/agents">agents list</Link>.
            </p>
          </div>
        }
        side={
          <MetaCard title="Details">
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Code</span><span>{row.code}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">City</span><span>{row.city || "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Depth</span><span>{row.depth}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Share</span><span>{row.sharePercent ?? "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Leader</span><span>{row.leader ? `${row.leader.name} · ${row.leader.code}` : "—"}</span></div>
            <div className="flex justify-between gap-3"><span className="text-zinc-500">Active</span><span>{row.active ? "Yes" : "No"}</span></div>
          </MetaCard>
        }
      />
    </div>
  );
}

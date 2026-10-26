"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamProgramSettings } from "@/lib/plans/team-settings";

export type TeamAgent = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  status: "PENDING" | "ACTIVE" | "PAUSED";
  active: boolean;
  sharePercent: number | null;
  depth: number;
  leaderId: string | null;
  code: string;
};

async function post(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/admin/agents/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, error: typeof json.error === "string" ? json.error : "Could not update the team" };
}

export function TeamDesk({ agents, settings }: { agents: TeamAgent[]; settings: TeamProgramSettings }) {
  const router = useRouter();
  const [shares, setShares] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(agents.map((agent) => [agent.id, agent.sharePercent == null ? "" : String(agent.sharePercent)]))
  );
  const [leaders, setLeaders] = React.useState<Record<string, string>>({});

  async function run(id: string, body: Record<string, unknown>) {
    const result = await post(id, body);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  function branch(parentId: string | null, depth: number): React.ReactNode {
    const rows = agents.filter((agent) => agent.leaderId === parentId);
    if (!rows.length) return null;
    return (
      <ul className={depth ? "ml-4 space-y-3 border-l pl-4" : "space-y-3"}>
        {rows.map((agent) => (
          <li key={agent.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="font-medium">{agent.name}</p>
              <p className="text-sm text-muted-foreground">
                {agent.phone || "No phone"} · {agent.status} · depth {agent.depth} · {agent.code}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {agent.status === "PENDING" ? (
                <>
                  <Button type="button" onClick={() => void run(agent.id, { action: "approve" })}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void run(agent.id, { action: "reject" })}>
                    Reject
                  </Button>
                </>
              ) : null}
              {agent.status === "ACTIVE" ? (
                <Button type="button" variant="outline" onClick={() => void run(agent.id, { action: "pause" })}>
                  Pause
                </Button>
              ) : null}
              {agent.status === "PAUSED" ? (
                <Button type="button" variant="outline" onClick={() => void run(agent.id, { action: "resume" })}>
                  Resume
                </Button>
              ) : null}
            </div>
            {agent.leaderId ? (
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(agent.id, { action: "share", sharePercent: Number(shares[agent.id]) });
                }}
              >
                <div>
                  <Label htmlFor={`share-${agent.id}`}>Member share %</Label>
                  <Input
                    id={`share-${agent.id}`}
                    type="number"
                    min={settings.minSharePercent}
                    max={settings.maxSharePercent}
                    value={shares[agent.id] ?? ""}
                    onChange={(event) => setShares({ ...shares, [agent.id]: event.target.value })}
                  />
                </div>
                <Button type="submit">Save share</Button>
              </form>
            ) : null}
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void run(agent.id, { action: "move", leaderUserId: leaders[agent.id] });
              }}
            >
              <div>
                <Label htmlFor={`move-${agent.id}`}>Move under</Label>
                <select
                  id={`move-${agent.id}`}
                  className="flex h-10 rounded-md border bg-background px-3 text-sm"
                  value={leaders[agent.id] || ""}
                  onChange={(event) => setLeaders({ ...leaders, [agent.id]: event.target.value })}
                >
                  <option value="">Choose a leader</option>
                  {agents
                    .filter((row) => row.id !== agent.id)
                    .map((row) => (
                      <option key={row.id} value={row.userId}>
                        {row.name} · depth {row.depth}
                      </option>
                    ))}
                </select>
              </div>
              <Button type="submit" variant="outline">
                Move
              </Button>
            </form>
            {branch(agent.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Team tree</h2>
      <p className="text-sm text-muted-foreground">
        Approve a pending member, pause them, or set the share of the commission pool. A per-agent commission rule above
        still decides the pool. The share only splits that pool, and only for sales after you save it.
      </p>
      {agents.length === 0 ? <p className="text-sm text-muted-foreground">No agents yet.</p> : branch(null, 0)}
    </section>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const ACTIONS = ["approve", "reject", "pause", "resume"] as const;

export function AgentActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState("");

  async function run(action: (typeof ACTIONS)[number]) {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/agents/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not update the agent");
      toast.success("Updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the agent");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <button key={action} type="button" className="h-9 rounded-[10px] border px-3 text-sm capitalize" disabled={busy !== ""} onClick={() => run(action)}>
          {busy === action ? "…" : action}
        </button>
      ))}
    </div>
  );
}

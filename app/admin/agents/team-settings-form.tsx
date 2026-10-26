"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { Input } from "@/components/admin/ui/controls";
import { Label } from "@/components/admin/ui/controls";
import type { TeamProgramSettings } from "@/lib/plans/team-settings";

export function TeamSettingsForm({ initial }: { initial: TeamProgramSettings }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/agents/team-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not save team settings");
      return;
    }
    toast.success("Team settings saved");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid max-w-xl gap-3 rounded-xl border p-4">
      <h2 className="font-display text-xl font-bold">Team and TDS</h2>
      <div>
        <Label htmlFor="team-depth">Max team depth</Label>
        <Input
          id="team-depth"
          type="number"
          min={1}
          max={5}
          value={form.maxTeamDepth}
          onChange={(event) => setForm({ ...form, maxTeamDepth: Number(event.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor="share-min">Minimum member share %</Label>
        <Input
          id="share-min"
          type="number"
          min={0}
          max={100}
          value={form.minSharePercent}
          onChange={(event) => setForm({ ...form, minSharePercent: Number(event.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor="share-max">Maximum member share %</Label>
        <Input
          id="share-max"
          type="number"
          min={0}
          max={100}
          value={form.maxSharePercent}
          onChange={(event) => setForm({ ...form, maxSharePercent: Number(event.target.value) })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm" htmlFor="auto-approve">
        <input
          id="auto-approve"
          type="checkbox"
          checked={form.autoApproveSubAgents}
          onChange={(event) => setForm({ ...form, autoApproveSubAgents: event.target.checked })}
        />
        Auto-approve sub-agents
      </label>
      <div>
        <Label htmlFor="tds-percent">TDS percent</Label>
        <Input
          id="tds-percent"
          type="number"
          min={0}
          max={30}
          value={form.tdsPercent}
          onChange={(event) => setForm({ ...form, tdsPercent: Number(event.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor="tds-threshold">Yearly TDS threshold (paise)</Label>
        <Input
          id="tds-threshold"
          type="number"
          min={0}
          value={form.tdsYearlyThresholdPaise}
          onChange={(event) => setForm({ ...form, tdsYearlyThresholdPaise: Number(event.target.value) })}
        />
      </div>
      <Button type="submit">Save team settings</Button>
    </form>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PlanProgramSettings } from "@/lib/plans/settings";

export function RewardForm({ initial }: { initial: PlanProgramSettings }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/referrals", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not save");
      return;
    }
    toast.success("Reward settings saved");
    router.refresh();
  }

  function months(key: keyof PlanProgramSettings["monthsByDuration"], value: string) {
    setForm({
      ...form,
      monthsByDuration: { ...form.monthsByDuration, [key]: Math.max(0, Math.floor(Number(value) || 0)) }
    });
  }

  return (
    <form onSubmit={save} className="grid max-w-xl gap-3">
      <div>
        <Label htmlFor="hold">Holding period (days)</Label>
        <Input id="hold" type="number" min={0} value={form.holdDays} onChange={(event) => setForm({ ...form, holdDays: Number(event.target.value) })} />
      </div>
      <div>
        <Label htmlFor="commission-hold">Commission hold (days)</Label>
        <Input
          id="commission-hold"
          type="number"
          min={0}
          value={form.commissionHoldDays}
          onChange={(event) => setForm({ ...form, commissionHoldDays: Number(event.target.value) })}
        />
      </div>
      <div>
        <Label htmlFor="cap">Max reward months per referrer per year</Label>
        <Input id="cap" type="number" min={0} value={form.maxMonthsPerYear} onChange={(event) => setForm({ ...form, maxMonthsPerYear: Number(event.target.value) })} />
      </div>
      <div>
        <Label htmlFor="bonus">Extra days for the new business</Label>
        <Input id="bonus" type="number" min={0} value={form.newBusinessDays} onChange={(event) => setForm({ ...form, newBusinessDays: Number(event.target.value) })} />
      </div>
      {(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"] as const).map((key) => (
        <div key={key}>
          <Label htmlFor={key}>Referrer months for {key}</Label>
          <Input id={key} type="number" min={0} value={form.monthsByDuration[key]} onChange={(event) => months(key, event.target.value)} />
        </div>
      ))}
      <Button type="submit">Save rewards</Button>
    </form>
  );
}

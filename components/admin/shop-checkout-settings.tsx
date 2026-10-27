"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { Input } from "@/components/admin/ui/controls";
import { Label } from "@/components/admin/ui/controls";

export function ShopCheckoutSettings({
  codEnabled,
  codAdvancePercent,
  commissionPercent
}: {
  codEnabled: boolean;
  codAdvancePercent: number;
  commissionPercent: number;
}) {
  const [enabled, setEnabled] = React.useState(codEnabled);
  const [percent, setPercent] = React.useState(String(codAdvancePercent));
  const [commission, setCommission] = React.useState(String(commissionPercent));
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/shop/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          codEnabled: enabled,
          codAdvancePercent: Number(percent),
          commissionPercent: Number(commission)
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save");
      toast.success("Shop checkout saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-xl space-y-3 rounded-[20px] bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Checkout</h2>
      <p className="text-sm text-muted-foreground">
        Orders are prepaid. Cash on delivery stays off until an advance below 100 percent is allowed. YouPI collects only that advance.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Allow partial cash on delivery
      </label>
      <div className="space-y-1">
        <Label htmlFor="cod-advance">Advance percent</Label>
        <Input id="cod-advance" inputMode="numeric" value={percent} onChange={(event) => setPercent(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="commission-percent">Agent commission percent</Label>
        <Input id="commission-percent" inputMode="numeric" value={commission} onChange={(event) => setCommission(event.target.value)} />
        <p className="text-sm text-muted-foreground">
          Default 10. A shop order snapshots the selected business&apos;s agent. A plan renewal pays the owner&apos;s only agent.
        </p>
      </div>
      <Button type="button" className="rounded-full" onClick={save} disabled={saving}>Save checkout</Button>
    </section>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminBusinessForm({
  id,
  name,
  ownerEmail,
  isActive
}: {
  id: string;
  name: string;
  ownerEmail: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [nextName, setNextName] = React.useState(name);
  const [active, setActive] = React.useState(isActive);
  const [busy, setBusy] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextName, isActive: active })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success("Saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 max-w-lg">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={nextName} onChange={(e) => setNextName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Owner email</Label>
        <Input value={ownerEmail} readOnly />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active (public review page and QR redirect)
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : active ? "Save" : "Suspend"}
      </Button>
    </form>
  );
}

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
  isActive,
  reviewGating,
  ratingThreshold
}: {
  id: string;
  name: string;
  ownerEmail: string;
  isActive: boolean;
  reviewGating: boolean;
  ratingThreshold: number;
}) {
  const router = useRouter();
  const [nextName, setNextName] = React.useState(name);
  const [active, setActive] = React.useState(isActive);
  const [gating, setGating] = React.useState(reviewGating);
  const [threshold, setThreshold] = React.useState(ratingThreshold);
  const [busy, setBusy] = React.useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          isActive: active,
          reviewGating: gating,
          ratingThreshold: threshold
        })
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
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={gating} onChange={(e) => setGating(e.target.checked)} />
        <span>Hide the public review link below a rating</span>
      </label>
      {gating && (
        <>
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
            Review gating is on for this business. Customers below the threshold will not see the
            public review link. Google’s review policy does not allow asking only some customers
            for a public review.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="threshold">Hide the public link below</Label>
            <select
              id="threshold"
              className="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            >
              <option value={3}>3 stars</option>
              <option value={4}>4 stars</option>
              <option value={5}>5 stars</option>
            </select>
          </div>
        </>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : active ? "Save" : "Suspend"}
      </Button>
    </form>
  );
}

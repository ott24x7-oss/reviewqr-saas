"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayButton({ agentId, disabled }: { agentId: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [utr, setUtr] = React.useState("");
  const [paidAt, setPaidAt] = React.useState("");
  const [note, setNote] = React.useState("");

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/commissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, utr, paidAt: paidAt || undefined, note })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not record the payout");
      return;
    }
    toast.success("Payout recorded");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        Pay
      </Button>
    );
  }
  return (
    <form onSubmit={pay} className="flex flex-col gap-2">
      <Input aria-label="UTR" placeholder="UTR" value={utr} onChange={(event) => setUtr(event.target.value)} required />
      <Input aria-label="Paid on" type="date" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      <Input aria-label="Note" placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      <Button type="submit">Record payout</Button>
    </form>
  );
}

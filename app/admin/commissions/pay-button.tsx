"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/utils";

export function PayButton({ agentId, disabled }: { agentId: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [utr, setUtr] = React.useState("");
  const [paidAt, setPaidAt] = React.useState("");
  const [note, setNote] = React.useState("");
  const [reason, setReason] = React.useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [idempotencyKey] = React.useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pay-${agentId}-${Date.now()}`
  );

  async function pay(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/admin/commissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, utr, paidAt: paidAt || undefined, note, reason, idempotencyKey })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not record the payout");
      return;
    }
    const gross = typeof json.grossPaise === "number" ? json.grossPaise : json.amountPaise;
    const tds = typeof json.tdsPaise === "number" ? json.tdsPaise : 0;
    const net = typeof json.netPaise === "number" ? json.netPaise : json.amountPaise;
    toast.success(`Payout recorded. Gross ${formatINR(gross || 0)}, TDS ${formatINR(tds)}, net ${formatINR(net || 0)}.`);
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
      <Input aria-label="Paid on" type="date" max={today} value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      <Input aria-label="Note" placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
      <Input
        aria-label="Reason"
        placeholder="Reason (required)"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        required
      />
      <Button type="submit">Record payout</Button>
    </form>
  );
}

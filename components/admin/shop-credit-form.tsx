"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ShopCreditForm() {
  const router = useRouter();
  const [orderId, setOrderId] = React.useState("");
  const [rupees, setRupees] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function save() {
    const id = orderId.trim();
    if (!id || !reason.trim()) {
      toast.error("Add the order id and a reason");
      return;
    }
    const amountPaise = rupees.trim() === "" ? undefined : Math.round(Number(rupees) * 100);
    if (amountPaise != null && (!Number.isInteger(amountPaise) || amountPaise <= 0)) {
      toast.error("Enter a credit amount above zero, or leave it blank for the full order");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/shop/orders/${id}/credit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), amountPaise })
      });
      const payload = (await response.json()) as { error?: string; number?: string };
      if (!response.ok) throw new Error(payload.error || "Could not issue the credit note");
      toast.success(payload.number ? `Credit note ${payload.number}` : "Credit note issued");
      setReason("");
      setRupees("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not issue the credit note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-xl space-y-3 rounded-[20px] bg-white p-4 shadow-sm">
      <h2 className="font-semibold">Issue a credit note</h2>
      <p className="text-sm text-muted-foreground">
        A refund uses the same invoice counter with a CN- prefix. Leave the amount blank to credit the full order. A free reprint does not create a credit note.
      </p>
      <div className="space-y-1">
        <Label htmlFor="credit-order">Order id</Label>
        <Input id="credit-order" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="credit-amount">Amount in rupees</Label>
        <Input id="credit-amount" inputMode="decimal" value={rupees} onChange={(event) => setRupees(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="credit-reason">Reason</Label>
        <Input id="credit-reason" value={reason} onChange={(event) => setReason(event.target.value)} />
      </div>
      <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={save} disabled={busy}>
        Issue credit note
      </Button>
    </section>
  );
}

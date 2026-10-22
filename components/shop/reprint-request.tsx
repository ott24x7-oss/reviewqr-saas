"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useShopLang } from "./lang";

export function ReprintRequest({ orderId, pending }: { orderId: string; pending: boolean }) {
  const router = useRouter();
  const { copy } = useShopLang();
  const [reason, setReason] = React.useState<"damage" | "misprint">("damage");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (pending) {
    return <p className="rounded-[20px] bg-white p-4 text-sm shadow-sm">{copy.reprintPending}</p>;
  }

  async function send() {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/shop/orders/${orderId}/reprint`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason, note })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Could not request a reprint");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not request a reprint");
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-[20px] bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{copy.reprint}</h2>
      <div className="space-y-1">
        <Label htmlFor="reprint-reason">{copy.reprintReason}</Label>
        <select
          id="reprint-reason"
          className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
          value={reason}
          onChange={(event) => setReason(event.target.value === "misprint" ? "misprint" : "damage")}
        >
          <option value="damage">{copy.damage}</option>
          <option value="misprint">{copy.misprint}</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="reprint-note">{copy.reprintNote}</Label>
        <textarea
          id="reprint-note"
          className="min-h-20 w-full rounded-xl border border-border px-3 py-2 text-sm"
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={send} disabled={busy}>
        {copy.reprint}
      </Button>
    </section>
  );
}

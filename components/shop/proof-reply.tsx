"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useShopLang } from "./lang";

export function ProofReply({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { copy } = useShopLang();
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function send(action: "approve" | "changes") {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/shop/orders/${orderId}/proof`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, comment })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Could not update the proof");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the proof");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" className="rounded-full bg-ink text-white hover:bg-ink/90" onClick={() => send("approve")} disabled={busy}>
        {copy.approve}
      </Button>
      <div className="space-y-2">
        <Label htmlFor="change-comment">{copy.changeNote}</Label>
        <textarea
          id="change-comment"
          className="min-h-20 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Button type="button" variant="outline" className="rounded-full" onClick={() => send("changes")} disabled={busy}>
        {copy.changes}
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PayNowButton({ paymentId }: { paymentId: string }) {
  const [busy, setBusy] = React.useState(false);
  async function pay() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/youpi/invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.checkoutUrl) throw new Error(json.error || "Could not start payment");
      window.location.href = json.checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment");
      setBusy(false);
    }
  }
  return (
    <Button type="button" size="sm" onClick={pay} disabled={busy} data-testid="pay-now">
      {busy ? "Starting…" : "Pay now"}
    </Button>
  );
}

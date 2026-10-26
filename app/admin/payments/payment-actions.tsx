"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentActions({
  id,
  status,
  provider
}: {
  id: string;
  status: string;
  provider: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [refundUtr, setRefundUtr] = React.useState("");
  const [reason, setReason] = React.useState("");

  async function run(action: "approve" | "reject" | "refund") {
    if (action !== "reject" && !reason.trim()) {
      toast.error("Write a reason first");
      return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/payments/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, refundUtr, reason: reason.trim() || undefined })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Request failed");
      toast.success(action === "approve" ? "Payment approved" : action === "reject" ? "Payment rejected" : "Marked refunded");
      router.refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  const pending = status === "PENDING" || status === "QUEUED";
  return (
    <div className="flex flex-col items-end gap-1.5">
      {(pending && provider !== "YOUPI") || status === "COMPLETED" ? (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          aria-label="Reason"
          className="h-8 w-40 text-xs"
        />
      ) : null}
      {pending && provider !== "YOUPI" && (
        <div className="flex gap-1">
          <Button size="sm" disabled={busy !== null} onClick={() => run("approve")}>
            {busy === "approve" ? "…" : "Approve"}
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("reject")}>
            Reject
          </Button>
        </div>
      )}
      {status === "COMPLETED" && (
        <div className="flex items-center gap-1">
          <Input
            value={refundUtr}
            onChange={(e) => setRefundUtr(e.target.value)}
            placeholder="Refund UTR"
            className="h-8 w-28 text-xs"
          />
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run("refund")}>
            Refund
          </Button>
        </div>
      )}
    </div>
  );
}

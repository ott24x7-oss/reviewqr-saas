"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";
import { Textarea } from "@/components/admin/ui/controls";

export function SupportReplyForm({ ticketId, status }: { ticketId: string; status: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function send(nextStatus?: "OPEN" | "CLOSED") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim() || undefined, status: nextStatus })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not reply");
      setBody("");
      toast.success(nextStatus === "CLOSED" ? "Ticket closed" : "Reply sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reply");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply" />
      <div className="flex gap-2">
        <Button type="button" disabled={busy || !body.trim()} onClick={() => send("OPEN")}>
          Reply
        </Button>
        {status !== "CLOSED" && (
          <Button type="button" variant="outline" disabled={busy} onClick={() => send("CLOSED")}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}

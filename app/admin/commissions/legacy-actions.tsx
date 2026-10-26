"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";

export function LegacyActions({ id }: { id: string }) {
  const router = useRouter();

  async function decide(action: "approve" | "paid") {
    const res = await fetch("/api/admin/commissions/legacy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "Could not update that commission");
      return;
    }
    toast.success(action === "approve" ? "Approved" : "Marked as already paid");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => decide("approve")}>
        Approve
      </Button>
      <Button type="button" variant="outline" onClick={() => decide("paid")}>
        Mark as already paid
      </Button>
    </div>
  );
}

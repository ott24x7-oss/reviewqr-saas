"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/admin/ui/controls";

export function StarterGuidesButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function addStarterGuides() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/blog/starter-guides", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add starter guides");

      const created = typeof data.created === "number" ? data.created : 0;
      toast.success(created > 0 ? `Added ${created} starter guide drafts.` : "Starter guide drafts already exist.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add starter guides");
    } finally {
      setBusy(false);
    }
  }

  return <Button type="button" variant="outline" disabled={busy} onClick={addStarterGuides}>
    {busy ? "Adding drafts…" : "Add starter guides (drafts)"}
  </Button>;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function accept() {
    setBusy(true);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not accept");
      router.push(`/dashboard/businesses/${json.businessId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not accept");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" className="auth-primary w-full" onClick={accept} disabled={busy}>
      {busy ? "Joining…" : "Accept invite"}
    </Button>
  );
}

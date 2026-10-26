"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function JoinButton({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function join() {
    setPending(true);
    const res = await fetch("/api/v1/agent/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code })
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      toast.error(json.error?.message || "Could not join this team");
      return;
    }
    toast.success(json.data?.status === "ACTIVE" ? "You are on the team" : "Request sent. Waiting for approval.");
    router.push("/dashboard/agent");
  }

  return (
    <Button type="button" onClick={() => void join()} disabled={pending}>
      Join this team
    </Button>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";

export function VerifyEmailBanner() {
  const [loading, setLoading] = React.useState(false);

  async function resend() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send the email");
      toast.success("Confirmation link sent");
    } catch (e: any) {
      toast.error(e.message || "Could not send the email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <p className="min-w-0 flex-1">Please confirm your email.</p>
      <button
        type="button"
        onClick={resend}
        disabled={loading}
        className="min-h-11 shrink-0 rounded-lg px-3 font-medium underline underline-offset-2 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}

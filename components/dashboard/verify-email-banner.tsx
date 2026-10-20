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
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      Confirm your email so we can reach you about this account. You can keep using the dashboard.
      <button
        type="button"
        onClick={resend}
        disabled={loading}
        className="ml-2 font-medium underline disabled:opacity-60"
      >
        {loading ? "Sending…" : "Resend link"}
      </button>
    </div>
  );
}

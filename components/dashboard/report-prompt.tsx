"use client";

import * as React from "react";
import { showReportPrompt } from "@/lib/reports/prompt";

const STORAGE_KEY = "reviewqr.reportPrompt";

export function ReportPrompt() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    if (dismissed) return;
    fetch("/api/v1/reports/preferences")
      .then((res) => res.json())
      .then((json) => {
        const emailOptIn = json.data?.emailOptIn === true;
        const whatsappOptIn = json.data?.whatsappOptIn === true;
        setOpen(showReportPrompt({ dismissed, emailOptIn, whatsappOptIn }));
      })
      .catch(() => undefined);
  }, []);

  async function answer(email: boolean, whatsapp: boolean) {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    if (!email && !whatsapp) return;
    await fetch("/api/v1/reports/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...(email ? { emailOptIn: true } : {}),
        ...(whatsapp ? { whatsappOptIn: true } : {})
      })
    });
  }

  if (!open) return null;
  return (
    <div className="mb-4 rounded-xl border bg-card p-4" role="region" aria-label="Weekly summary">
      <p className="text-sm font-medium">Get a weekly summary by email/WhatsApp?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-foreground" onClick={() => answer(true, false)}>
          Email
        </button>
        <button type="button" className="min-h-11 rounded-lg border px-4 text-sm" onClick={() => answer(false, true)}>
          WhatsApp
        </button>
        <button type="button" className="min-h-11 rounded-lg border px-4 text-sm" onClick={() => answer(true, true)}>
          Both
        </button>
        <button type="button" className="min-h-11 rounded-lg px-4 text-sm text-muted-foreground" onClick={() => answer(false, false)}>
          Not now
        </button>
      </div>
    </div>
  );
}

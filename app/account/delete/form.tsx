"use client";

import { useState } from "react";

type Sent = { channel?: string; resendAfterSec?: number; devCode?: string; message?: string };

export function DeleteAccountForm() {
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/deletion", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: Sent & { ok?: boolean };
        error?: { message?: string };
      };
      if (res.status === 401) {
        setError("Sign in on the web, then come back to this page.");
        return;
      }
      if (!res.ok) {
        setError(json.error?.message || "Could not delete the account");
        return;
      }
      if (json.data?.ok) {
        setDone(true);
        return;
      }
      setSent(json.data ?? { channel: "whatsapp" });
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p>This account is deleted. Invoices are kept. You can close this page.</p>;
  }

  return (
    <form
      className="not-prose mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (sent) void post({ action: "confirm", code });
        else void post({ action: "request" });
      }}
    >
      <p className="text-sm text-muted-foreground">
        {sent?.message || "We send a 6-digit code to the mobile number on the account, then anonymize it."}
      </p>
      {sent?.channel ? (
        <p className="text-sm">
          {sent.channel === "email"
            ? "Code sent on email."
            : sent.channel === "dev"
              ? "Code sent in this dev build."
              : "Code sent on WhatsApp."}
        </p>
      ) : null}
      {sent?.devCode ? <p className="text-sm font-medium">Dev code: {sent.devCode}</p> : null}
      {sent ? (
        <label className="block text-sm">
          Code
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-1 w-full rounded-xl border px-3 py-3 text-base"
          />
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {error?.includes("Sign in") ? (
        <p>
          <a className="underline" href="/login">
            Sign in
          </a>
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || (sent ? code.length !== 6 : false)}
        className="rounded-full bg-neutral-900 px-5 py-3 text-sm text-white disabled:opacity-50"
      >
        {sent ? "Delete my account" : "Send deletion code"}
      </button>
    </form>
  );
}

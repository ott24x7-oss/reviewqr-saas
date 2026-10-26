"use client";

import * as React from "react";
import { toast } from "sonner";
import type { AdminStepUpAction } from "@reviewqr/shared";

export function ConfirmReason({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  onClose,
  onConfirm
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form
        className="w-full max-w-md rounded-[14px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!reason.trim()) return;
          setBusy(true);
          try {
            await onConfirm(reason.trim());
            setReason("");
            onClose();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {body ? <p className="mt-1 text-sm text-zinc-500">{body}</p> : null}
        <label className="mt-4 block text-sm font-medium" htmlFor="admin-reason">
          Reason
        </label>
        <textarea
          id="admin-reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-[10px] border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-[10px] border px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="rounded-[10px] bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export async function sendStepUp() {
  const res = await fetch("/api/admin/step-up", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Could not send the code");
}

/** The code is exchanged for a one-time confirmation of this one action. */
export async function confirmStepUp(code: string, action: AdminStepUpAction) {
  const res = await fetch("/api/admin/step-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, action })
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "That code did not match");
}

export function StepUpDialog({
  open,
  title,
  action,
  onClose,
  onConfirmed
}: {
  open: boolean;
  title: string;
  /** What the code confirms. The server refuses it for anything else, and after one use. */
  action: AdminStepUpAction;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
}) {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    sendStepUp().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not send the code"));
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form
        className="w-full max-w-md rounded-[14px] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await confirmStepUp(code.trim(), action);
            await onConfirmed();
            setCode("");
            onClose();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not confirm");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">Enter the WhatsApp code to confirm this.</p>
        <label className="mt-4 block text-sm font-medium" htmlFor="admin-step-code">
          WhatsApp code
        </label>
        <input
          id="admin-step-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="mt-1 h-10 w-full rounded-[10px] border border-zinc-200 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-[10px] border px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="rounded-[10px] bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={busy}>
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
}

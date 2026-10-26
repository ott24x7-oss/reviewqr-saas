"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmReason, StepUpDialog } from "@/components/admin/ui/dialogs";
import { StatusBadge } from "@/components/admin/ui/primitives";

type Item = { id: string; title: string; subtitle: string; status: string; createdAt: string };

const ACTIONS: Record<string, { id: string; label: string }[]> = {
  agents: [
    { id: "approve", label: "Approve" },
    { id: "reject", label: "Reject" }
  ],
  devices: [
    { id: "approve", label: "Approve" },
    { id: "revoke", label: "Revoke" }
  ],
  proofs: [{ id: "approve", label: "Approve" }],
  shop: [{ id: "advance", label: "Advance" }],
  support: [{ id: "close", label: "Close" }],
  refunds: [{ id: "close", label: "Close" }],
  failed: [{ id: "reject", label: "Reject" }]
};

export function InboxBoard({
  segment,
  counts,
  items
}: {
  segment: string;
  counts: Record<string, number>;
  items: Item[];
}) {
  const router = useRouter();
  const [picked, setPicked] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState<{ action: string; ids: string[] } | null>(null);
  const [step, setStep] = React.useState(false);
  const [held, setHeld] = React.useState<{ action: string; ids: string[]; reason: string } | null>(null);
  const actions = ACTIONS[segment] || [];

  async function send(action: string, ids: string[], reason: string) {
    const res = await fetch("/api/admin/inbox", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ segment, action, ids, reason })
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setHeld({ action, ids, reason });
      setStep(true);
      throw new Error(json.error || "Enter the WhatsApp code to confirm this");
    }
    if (!res.ok) throw new Error(json.error || "Could not update the inbox");
    toast.success("Updated");
    setPicked([]);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([key, count]) => (
          <Link
            key={key}
            href={`/admin/inbox?segment=${key}`}
            className={`rounded-full border px-3 py-1 text-sm ${segment === key ? "border-emerald-600 text-emerald-700" : "border-zinc-200 dark:border-zinc-700"}`}
          >
            {key} {count}
          </Link>
        ))}
      </div>
      {segment === "payouts" ? (
        <p className="text-sm text-zinc-500">
          Mark a payout paid from <Link className="underline" href="/admin/commissions">Commissions</Link>. That step asks for a WhatsApp code.
        </p>
      ) : null}
      {picked.length && actions[0] ? (
        <button type="button" className="rounded-[10px] bg-zinc-950 px-3 py-2 text-sm text-white dark:bg-white dark:text-zinc-950" onClick={() => setPending({ action: actions[0].id, ids: picked })}>
          {actions[0].label} selected
        </button>
      ) : null}
      <div className="overflow-x-auto rounded-[14px] border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-zinc-500">
            <tr>
              <th className="px-3 py-2"> </th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-zinc-500" colSpan={4}>Nothing waiting in this queue.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={`Select ${item.title}`} checked={picked.includes(item.id)} onChange={(event) => setPicked((current) => (event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id)))} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-zinc-500">{item.subtitle}</div>
                  </td>
                  <td className="px-3 py-3"><StatusBadge value={item.status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <button key={action.id} type="button" className="rounded-[10px] border px-2 py-1 text-xs" onClick={() => setPending({ action: action.id, ids: [item.id] })}>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ConfirmReason
        open={!!pending}
        title="Confirm this inbox action"
        body="A reason is written to the audit log."
        confirmLabel="Confirm"
        onClose={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return;
          await send(pending.action, pending.ids, reason);
        }}
      />
      <StepUpDialog
        open={step}
        title="Confirm device approval"
        onClose={() => setStep(false)}
        onConfirmed={async () => {
          if (!held) return;
          await send(held.action, held.ids, held.reason);
        }}
      />
    </div>
  );
}

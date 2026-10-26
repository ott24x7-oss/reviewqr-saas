"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AdminStepUpAction } from "@reviewqr/shared";
import { StepUpDialog } from "@/components/admin/ui/dialogs";
import { fieldClass } from "@/components/admin/ui/form-section";

export function CustomerActions({
  userId,
  plans,
  suspended
}: {
  userId: string;
  plans: { id: string; name: string }[];
  suspended: boolean;
}) {
  const router = useRouter();
  const [planId, setPlanId] = React.useState(plans[0]?.id || "");
  const [days, setDays] = React.useState("7");
  const [reason, setReason] = React.useState("");
  const [note, setNote] = React.useState("");
  const [role, setRole] = React.useState("USER");
  const [phone, setPhone] = React.useState("");
  const [step, setStep] = React.useState<null | { action: AdminStepUpAction; retry: () => Promise<void> }>(null);

  async function post(body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/customers/${userId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) {
      const action = json.stepUp as AdminStepUpAction | undefined;
      if (action) {
        setStep({
          action,
          retry: async () => {
            setStep(null);
            await post(body);
          }
        });
      }
      throw new Error(json.error || "Enter the WhatsApp code to confirm this");
    }
    if (!res.ok) throw new Error(json.error || "Could not update the customer");
    if (typeof json.phone === "string") setPhone(json.phone);
    toast.success("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-[14px] border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Account actions</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          Plan
          <select className={fieldClass} value={planId} onChange={(event) => setPlanId(event.target.value)} aria-label="Plan">
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
          </select>
        </label>
        <button type="button" className="h-10 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "plan", planId, reason }).catch((error: Error) => toast.error(error.message))}>Change plan</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Days
          <input className={fieldClass} inputMode="numeric" aria-label="Days to grant" value={days} onChange={(event) => setDays(event.target.value)} />
        </label>
        <label className="text-sm">Reason
          <input className={fieldClass} aria-label="Action reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <button type="button" className="h-10 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "grant", days: Number(days), reason }).catch((error: Error) => toast.error(error.message))}>Grant days</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: suspended ? "unsuspend" : "suspend", reason }).catch((error: Error) => toast.error(error.message))}>{suspended ? "Unsuspend" : "Suspend"}</button>
        <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "cancel", reason }).catch((error: Error) => toast.error(error.message))}>Cancel</button>
        <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "resend" }).catch((error: Error) => toast.error(error.message))}>Resend login</button>
        <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "reset-onboarding" }).catch((error: Error) => toast.error(error.message))}>Reset onboarding</button>
        <button type="button" className="h-9 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "reveal", reason }).catch((error: Error) => toast.error(error.message))}>Reveal phone</button>
      </div>
      {phone ? <p className="text-sm">Phone: {phone}</p> : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">Role
          <select className={fieldClass} aria-label="New role" value={role} onChange={(event) => setRole(event.target.value)}>
            {["USER", "ADMIN", "AGENCY", "STAFF", "AGENT"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button type="button" className="h-10 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "role", role, reason }).catch((error: Error) => toast.error(error.message))}>Change role</button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 text-sm">Note
          <input className={fieldClass} aria-label="Customer note" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button type="button" className="h-10 rounded-[10px] border px-3 text-sm" onClick={() => post({ action: "note", note }).catch((error: Error) => toast.error(error.message))}>Add note</button>
      </div>
      <StepUpDialog open={!!step} title="Confirm this change" action={step?.action || "change_role"} onClose={() => setStep(null)} onConfirmed={async () => { if (step) await step.retry(); }} />
    </div>
  );
}

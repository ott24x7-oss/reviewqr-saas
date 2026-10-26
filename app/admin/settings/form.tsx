"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StepUpDialog } from "@/components/admin/ui/dialogs";
import { Field, FormSection, StickySave, fieldClass } from "@/components/admin/ui/form-section";

type Settings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maxTeamDepth: number;
  minSharePercent: number;
  maxSharePercent: number;
  autoApproveSubAgents: boolean;
  tdsPercent: number;
  tdsYearlyThresholdPaise: number;
  minVersionCode: number;
  latestVersionCode: number;
  flags: Record<string, boolean>;
  notify: Record<string, boolean>;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [dirty, setDirty] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [step, setStep] = React.useState(false);
  const [pending, setPending] = React.useState<Record<string, unknown> | null>(null);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function save(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) {
      setPending(body);
      setStep(true);
      return;
    }
    if (!res.ok) {
      toast.error(json.error || "Could not save settings");
      return;
    }
    toast.success("Settings saved");
    setDirty(false);
    setPending(null);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const sensitive = form.minSharePercent !== initial.minSharePercent || form.maxSharePercent !== initial.maxSharePercent || form.tdsPercent !== initial.tdsPercent || form.tdsYearlyThresholdPaise !== initial.tdsYearlyThresholdPaise;
        if (sensitive && !reason.trim()) {
          toast.error("Enter a reason");
          return;
        }
        void save({
          maintenanceMode: form.maintenanceMode,
          maintenanceMessage: form.maintenanceMessage,
          autoApproveSubAgents: form.autoApproveSubAgents,
          maxTeamDepth: form.maxTeamDepth,
          minSharePercent: form.minSharePercent,
          maxSharePercent: form.maxSharePercent,
          tdsPercent: form.tdsPercent,
          tdsYearlyThresholdPaise: form.tdsYearlyThresholdPaise,
          flags: form.flags,
          notify: form.notify,
          reason: reason.trim() || undefined
        });
      }}
    >
      <FormSection title="Maintenance" description="The public site shows this banner. Other site fields stay where they are.">
        <Field label="Maintenance mode">
          <input type="checkbox" checked={form.maintenanceMode} onChange={(event) => patch("maintenanceMode", event.target.checked)} />
        </Field>
        <Field label="Message">
          <input className={fieldClass} value={form.maintenanceMessage} onChange={(event) => patch("maintenanceMessage", event.target.value)} />
        </Field>
      </FormSection>
      <FormSection title="Team and TDS" description="Share caps and TDS need a WhatsApp code. The agent screen edits the same values.">
        <Field label="Max team depth">
          <input className={fieldClass} inputMode="numeric" value={form.maxTeamDepth} onChange={(event) => patch("maxTeamDepth", Number(event.target.value))} />
        </Field>
        <Field label="Min share percent">
          <input className={fieldClass} inputMode="numeric" value={form.minSharePercent} onChange={(event) => patch("minSharePercent", Number(event.target.value))} />
        </Field>
        <Field label="Max share percent">
          <input className={fieldClass} inputMode="numeric" value={form.maxSharePercent} onChange={(event) => patch("maxSharePercent", Number(event.target.value))} />
        </Field>
        <Field label="TDS percent">
          <input className={fieldClass} aria-label="TDS percent" inputMode="numeric" value={form.tdsPercent} onChange={(event) => patch("tdsPercent", Number(event.target.value))} />
        </Field>
        <Field label="Auto-approve sub-agents">
          <input type="checkbox" checked={form.autoApproveSubAgents} onChange={(event) => patch("autoApproveSubAgents", event.target.checked)} />
        </Field>
        <Field label="Reason for money settings">
          <input className={fieldClass} aria-label="Settings reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </FormSection>
      <FormSection title="Notifications" description="Which events can ping this admin.">
        {Object.entries(form.notify).map(([key, value]) => (
          <Field key={key} label={key}>
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => patch("notify", { ...form.notify, [key]: event.target.checked })}
            />
          </Field>
        ))}
      </FormSection>
      <FormSection title="Flags" description="Boolean switches stored for the platform.">
        {Object.keys(form.flags).length === 0 ? <p className="text-sm text-zinc-500">No flags yet.</p> : null}
        {Object.entries(form.flags).map(([key, value]) => (
          <Field key={key} label={key}>
            <input type="checkbox" checked={value} onChange={(event) => patch("flags", { ...form.flags, [key]: event.target.checked })} />
          </Field>
        ))}
      </FormSection>
      <FormSection title="App versions" description="Edit these on Apps & devices. Shown here so the numbers stay visible.">
        <p className="text-sm">Minimum {form.minVersionCode} · Latest {form.latestVersionCode}</p>
      </FormSection>
      <StickySave dirty={dirty}>
        <button type="submit" className="h-9 rounded-[10px] bg-zinc-950 px-3 text-sm text-white dark:bg-white dark:text-zinc-950">Save settings</button>
      </StickySave>
      <StepUpDialog open={step} title="Confirm settings" onClose={() => setStep(false)} onConfirmed={async () => { if (pending) await save(pending); }} />
    </form>
  );
}

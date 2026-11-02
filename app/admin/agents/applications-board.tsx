"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type ResellerApplicationRow = {
  id: string;
  userId: string;
  applicantName: string;
  phone: string;
  city: string;
  state: string;
  howSell: string;
  experience: string;
  languages: string[];
  referralOrTeamCode: string;
  termsVersion: string;
  termsAcceptedAt: string;
  appliedAt: string;
  signupAt: string;
  businessesOwned: number;
};

type Leader = { id: string; name: string; city: string; depth: number };

function sellingMethod(value: string) {
  return ({ SHOP_VISITS: "Shop visits", EXISTING_CLIENTS: "Existing clients", ONLINE: "Online", OTHER: "Other" } as Record<string, string>)[value] || value;
}

export function ApplicationsBoard({ applications, leaders, minSharePercent, maxSharePercent }: { applications: ResellerApplicationRow[]; leaders: Leader[]; minSharePercent: number; maxSharePercent: number }) {
  const router = useRouter();
  const [choice, setChoice] = React.useState<Record<string, { leaderId: string; sharePercent: string; reason: string }>>({});
  const [working, setWorking] = React.useState<string | null>(null);
  const value = (id: string) => choice[id] || { leaderId: "", sharePercent: String(minSharePercent), reason: "" };

  async function decide(application: ResellerApplicationRow, action: "approve" | "reject") {
    const draft = value(application.id);
    if (action === "reject" && !draft.reason.trim()) {
      toast.error("Add a reason before rejecting this application");
      return;
    }
    setWorking(application.id);
    const response = await fetch(`/api/admin/agent-applications/${application.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        ...(action === "reject" ? { reason: draft.reason.trim() } : {
          leaderId: draft.leaderId || null,
          sharePercent: draft.leaderId ? Number(draft.sharePercent) : null
        })
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) toast.error(body.error || "Could not update the application");
    else {
      toast.success(action === "approve" ? "Reseller application approved" : "Reseller application rejected");
      router.refresh();
    }
    setWorking(null);
  }

  if (!applications.length) return <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">No reseller applications are waiting for review.</div>;

  return <div className="space-y-4">
    {applications.map((application) => {
      const draft = value(application.id);
      return <article key={application.id} className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{application.applicantName}</h2>
            <p className="text-sm text-muted-foreground">{application.phone} · {application.city}, {application.state}</p>
          </div>
          <p className="text-sm text-muted-foreground">Applied {new Date(application.appliedAt).toLocaleDateString("en-IN")} · Signed up {new Date(application.signupAt).toLocaleDateString("en-IN")} · {application.businessesOwned} businesses</p>
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div><dt className="font-medium">How they will sell</dt><dd className="text-muted-foreground">{sellingMethod(application.howSell)}</dd></div>
          <div><dt className="font-medium">Languages</dt><dd className="text-muted-foreground">{application.languages.join(", ")}</dd></div>
          <div><dt className="font-medium">Experience</dt><dd className="text-muted-foreground">{application.experience || "Not provided"}</dd></div>
          <div><dt className="font-medium">Referral or team code</dt><dd className="text-muted-foreground">{application.referralOrTeamCode || "None"}</dd></div>
          <div><dt className="font-medium">Terms accepted</dt><dd className="text-muted-foreground">{application.termsVersion} · {new Date(application.termsAcceptedAt).toLocaleString("en-IN")}</dd></div>
        </dl>
        <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <label className="grid gap-1 text-sm font-medium">Leader (optional)
            <select className="h-10 rounded-md border bg-background px-3 font-normal" value={draft.leaderId} onChange={(event) => setChoice((current) => ({ ...current, [application.id]: { ...draft, leaderId: event.target.value } }))}>
              <option value="">Direct to QR24x7</option>
              {leaders.map((leader) => <option key={leader.id} value={leader.id}>{leader.name}{leader.city ? ` · ${leader.city}` : ""}</option>)}
            </select>
          </label>
          {draft.leaderId ? <label className="grid gap-1 text-sm font-medium">Share %
            <input className="h-10 rounded-md border bg-background px-3 font-normal" inputMode="numeric" min={minSharePercent} max={maxSharePercent} type="number" value={draft.sharePercent} onChange={(event) => setChoice((current) => ({ ...current, [application.id]: { ...draft, sharePercent: event.target.value } }))} />
          </label> : <div />}
          <button type="button" disabled={working === application.id} onClick={() => decide(application, "approve")} className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{working === application.id ? "Saving…" : "Approve"}</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-64 flex-1 gap-1 text-sm font-medium">Reason to reject
            <input className="h-10 rounded-md border bg-background px-3 font-normal" maxLength={500} value={draft.reason} onChange={(event) => setChoice((current) => ({ ...current, [application.id]: { ...draft, reason: event.target.value } }))} />
          </label>
          <button type="button" disabled={working === application.id || !draft.reason.trim()} onClick={() => decide(application, "reject")} className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-semibold disabled:opacity-50">Reject</button>
        </div>
      </article>;
    })}
  </div>;
}

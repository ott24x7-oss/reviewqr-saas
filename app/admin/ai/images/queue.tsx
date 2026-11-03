"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/admin/ui/controls";

type Row = {
  id: string; status: string; candidateUrl: string | null; error: string | null; createdAt: string;
  business: { id: string; name: string }; item: { id: string; name: string; photo: string | null; photos: string[] };
};

export function ImageJobQueue({ initial }: { initial: Row[] }) {
  const [rows, setRows] = React.useState(initial);
  const [status, setStatus] = React.useState("ALL");
  const [busy, setBusy] = React.useState(false);
  const [keepOldAsGallery, setKeepOldAsGallery] = React.useState(false);
  async function refresh() {
    const res = await fetch("/api/admin/item-image-jobs");
    const json = await res.json();
    if (res.ok) setRows(json.jobs || []);
  }
  async function call(url: string, method: string, body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not update photo");
      toast.success("Photo queue updated"); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update photo"); }
    finally { setBusy(false); }
  }
  const shown = rows.filter((row) => status === "ALL" || row.status === status);
  const ready = shown.filter((row) => row.status === "READY");
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <select aria-label="Filter image jobs" className="h-10 rounded-md border bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
        {["ALL", "QUEUED", "RUNNING", "READY", "FAILED", "APPROVED", "REJECTED"].map((item) => <option key={item} value={item}>{item === "ALL" ? "All jobs" : item}</option>)}
      </select>
      {ready.length ? <><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={keepOldAsGallery} onChange={(event) => setKeepOldAsGallery(event.target.checked)} />Keep current photos in each item gallery</label><Button type="button" disabled={busy || ready.length > 500} onClick={() => void call("/api/admin/item-image-jobs/approve", "POST", { jobIds: ready.map((job) => job.id), keepOldAsGallery })}>Approve all ready ({ready.length})</Button></> : null}
    </div>
    {shown.length === 0 ? <p className="rounded-xl border p-6 text-sm text-muted-foreground">No jobs in this queue.</p> : null}
    <div className="grid gap-4 lg:grid-cols-2">
      {shown.map((row) => <JobCard key={row.id} row={row} busy={busy} keepOldAsGallery={keepOldAsGallery} call={call} />)}
    </div>
  </div>;
}

function JobCard({ row, busy, keepOldAsGallery, call }: { row: Row; busy: boolean; keepOldAsGallery: boolean; call: (url: string, method: string, body: unknown) => Promise<void> }) {
  const [note, setNote] = React.useState("");
  return <article className="space-y-3 rounded-xl border bg-white p-4 dark:bg-slate-950">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{row.item.name}</h2><p className="text-sm text-muted-foreground"><a className="underline" href={`/admin/businesses/${row.business.id}`}>{row.business.name}</a> · {row.status}</p></div><time className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</time></div>
    <div className="grid grid-cols-2 gap-3"><div><p className="mb-1 text-xs text-muted-foreground">Current</p>{row.item.photo ? <img src={row.item.photo} alt={`Current photo of ${row.item.name}`} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square rounded-lg border bg-muted" />}</div><div><p className="mb-1 text-xs text-muted-foreground">Candidate</p>{row.candidateUrl ? <img src={row.candidateUrl} alt={`Candidate photo of ${row.item.name}`} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square rounded-lg border bg-muted" />}</div></div>
    {row.error ? <p className="text-sm text-red-600">{row.error}</p> : null}
    {row.status === "READY" ? <><Input aria-label={`Regeneration note for ${row.item.name}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional regeneration note" /><div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => void call("/api/admin/item-image-jobs/approve", "POST", { jobIds: [row.id], keepOldAsGallery })}>Approve</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void call(`/api/admin/item-image-jobs/${row.id}`, "PATCH", { action: "reject" })}>Reject</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void call(`/api/admin/item-image-jobs/${row.id}`, "PATCH", { action: "regenerate", extraPromptNote: note })}>Regenerate</Button></div></> : null}
  </article>;
}

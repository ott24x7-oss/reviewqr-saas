"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button, Input } from "@/components/admin/ui/controls";

type Item = {
  id: string; name: string; photo: string | null; photos: string[];
  category: { name: string } | null;
  imageJobs: Array<{ id: string; status: string; candidateUrl: string | null; error: string | null }>;
};

export function AiItemPhotos({ businessId }: { businessId: string }) {
  const [filter, setFilter] = React.useState<"no_photo" | "all">("no_photo");
  const [items, setItems] = React.useState<Item[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [keepOldAsGallery, setKeepOldAsGallery] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/item-images?filter=${filter}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load items");
      setItems(json.items || []); setSelected([]);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load items"); }
    finally { setLoading(false); }
  }, [businessId, filter]);
  React.useEffect(() => { void load(); }, [load]);
  async function generate(ids = selected) {
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/item-images`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemIds: ids })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not queue images");
      toast.success(`${json.created} image${json.created === 1 ? "" : "s"} queued`);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not queue images"); }
    finally { setBusy(false); }
  }
  async function action(url: string, method: string, body: unknown) {
    setBusy(true);
    try {
      const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not update image");
      toast.success("Image review saved"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update image"); }
    finally { setBusy(false); }
  }
  const ready = items.flatMap((item) => item.imageJobs.filter((job) => job.status === "READY").map((job) => ({ item, job })));
  return (
    <section className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-semibold">AI item photos</h2><p className="text-sm text-muted-foreground">Generate candidates for selected items, then review each image.</p></div>
        <select aria-label="Filter items" className="h-10 rounded-md border bg-background px-3 text-sm" value={filter} onChange={(event) => setFilter(event.target.value as "no_photo" | "all")}>
          <option value="no_photo">Items with no photo</option><option value="all">All items</option>
        </select>
      </div>
      <div className="space-y-2">
        {loading ? <p className="text-sm text-muted-foreground">Loading items…</p> : null}
        {!loading && items.length === 0 ? <p className="text-sm text-muted-foreground">No items match this filter.</p> : null}
        {items.map((item) => {
          const latest = item.imageJobs[0];
          const open = latest && ["QUEUED", "RUNNING", "READY"].includes(latest.status);
          return <label key={item.id} className="flex min-h-12 items-center gap-3 rounded-lg border p-3 text-sm">
            <input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.id)} disabled={!!open} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id].slice(0, 50) : current.filter((id) => id !== item.id))} />
            {item.photo ? <img src={item.photo} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded border" />}
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.category?.name || "Uncategorised"}{latest ? ` · ${latest.status.toLowerCase()}` : ""}</span></span>
          </label>;
        })}
      </div>
      <Button type="button" disabled={busy || selected.length === 0} onClick={() => void generate()}>{busy ? "Working…" : `Generate photos (${selected.length})`}</Button>
      {ready.length ? <div className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Ready to review ({ready.length})</h3><Button type="button" variant="outline" disabled={busy || ready.length > 500} onClick={() => void action("/api/admin/item-image-jobs/approve", "POST", { jobIds: ready.map((entry) => entry.job.id), keepOldAsGallery })}>Approve all ready</Button></div>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={keepOldAsGallery} onChange={(event) => setKeepOldAsGallery(event.target.checked)} />Keep the current photo in the item gallery</label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ready.map(({ item, job }) => <ReviewCard key={job.id} item={item} job={job} busy={busy} keepOldAsGallery={keepOldAsGallery} onAction={action} />)}
        </div>
      </div> : null}
    </section>
  );
}

function ReviewCard({ item, job, busy, keepOldAsGallery, onAction }: { item: Item; job: Item["imageJobs"][number]; busy: boolean; keepOldAsGallery: boolean; onAction: (url: string, method: string, body: unknown) => Promise<void> }) {
  const [note, setNote] = React.useState("");
  return <article className="space-y-3 rounded-xl border p-3">
    <h4 className="font-medium">{item.name}</h4>
    <div className="grid grid-cols-2 gap-2"><div><p className="mb-1 text-xs text-muted-foreground">Current</p>{item.photo ? <img src={item.photo} alt={`Current photo of ${item.name}`} className="aspect-square w-full rounded-lg object-cover" /> : <div className="aspect-square rounded-lg border bg-muted" />}</div><div><p className="mb-1 text-xs text-muted-foreground">Candidate</p>{job.candidateUrl ? <img src={job.candidateUrl} alt={`Generated photo of ${item.name}`} className="aspect-square w-full rounded-lg object-cover" /> : null}</div></div>
    <Input aria-label={`Regenerate note for ${item.name}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for regeneration" />
    <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => void onAction("/api/admin/item-image-jobs/approve", "POST", { jobIds: [job.id], keepOldAsGallery })}>Approve</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void onAction(`/api/admin/item-image-jobs/${job.id}`, "PATCH", { action: "reject" })}>Reject</Button><Button type="button" variant="outline" disabled={busy} onClick={() => void onAction(`/api/admin/item-image-jobs/${job.id}`, "PATCH", { action: "regenerate", extraPromptNote: note })}>Regenerate</Button></div>
  </article>;
}

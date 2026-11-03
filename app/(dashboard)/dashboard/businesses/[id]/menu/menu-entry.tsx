"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreView } from "@/lib/store/layout";
import {
  blankRow,
  normalizeVeg,
  rowError,
  splitPastedItems,
  type EntryRow
} from "@/lib/store/entry";
import { STORE_TEMPLATES } from "@/lib/store/templates";

export type MenuSave = false | { added?: number; message?: string; variantId?: string };

type BulkPreviewRow = {
  index: number;
  row: EntryRow;
  errors: string[];
  warnings: string[];
  matchedItemId: string | null;
  action: "add" | "update" | "skip";
};

function bulkRowErrors(row: EntryRow) {
  const errors: string[] = [];
  if (!row.name.trim()) errors.push("Missing name");
  if (row.price.trim() && (!/^\d+(?:\.\d{1,2})?$/.test(row.price.trim()) || Number(row.price) < 0 || Number(row.price) > 100000)) errors.push("Invalid price");
  if (row.mrp.trim() && (!/^\d+(?:\.\d{1,2})?$/.test(row.mrp.trim()) || Number(row.mrp) < 0 || Number(row.mrp) > 100000)) errors.push("Invalid MRP");
  if (row.veg.trim() && !normalizeVeg(row.veg)) errors.push("Veg must be VEG, NON_VEG, or EGG");
  if (row.kind.trim() && !["PRODUCT", "SERVICE"].includes(row.kind.trim().toUpperCase())) errors.push("Kind must be PRODUCT or SERVICE");
  if (row.durationMinutes.trim() && (!/^\d+$/.test(row.durationMinutes) || Number(row.durationMinutes) < 1 || Number(row.durationMinutes) > 1440)) errors.push("Invalid service duration");
  if (row.available.trim() && !/^(yes|no|true|false|1|0)$/i.test(row.available.trim())) errors.push("Available must be yes or no");
  if (row.imageUrl.trim()) {
    try { if (new URL(row.imageUrl).protocol !== "https:") errors.push("Image URL must use HTTPS"); }
    catch { errors.push("Image URL is invalid"); }
  }
  return errors;
}

export function rowFromDraft(item: { name?: string; priceRupees?: number; veg?: string }): EntryRow {
  const row = blankRow();
  row.name = String(item.name || "");
  row.price = item.priceRupees == null ? "" : String(item.priceRupees);
  row.veg = item.veg || "";
  return row;
}

export function MenuEntry({
  businessId,
  layout,
  busy,
  aiReady,
  rows,
  setRows,
  paste,
  setPaste,
  send
}: {
  businessId: string;
  layout: StoreView;
  busy: boolean;
  aiReady: boolean;
  rows: EntryRow[];
  setRows: React.Dispatch<React.SetStateAction<EntryRow[]>>;
  paste: string;
  setPaste: (value: string) => void;
  send: (body: Record<string, unknown>, keepForm?: boolean) => Promise<MenuSave>;
}) {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [bulkRows, setBulkRows] = React.useState<BulkPreviewRow[]>([]);
  const [bulkCategories, setBulkCategories] = React.useState<string[]>([]);
  const [bulkLimit, setBulkLimit] = React.useState<{ used: number; cap: number; remaining: number; additions: number; fits: number } | null>(null);
  const [bulkMode, setBulkMode] = React.useState<"add_new" | "update_existing">("add_new");
  const [bulkResult, setBulkResult] = React.useState<{ created: number; updated: number; skipped: number; failed: number; noPhoto: number; imageJobs?: Array<{ jobId: string; rowIndex: number }>; imageErrors?: Array<{ rowIndex: number; error: string }> } | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  function updateRow(index: number, patch: Partial<EntryRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addLines() {
    const found = splitPastedItems(paste);
    if (!found.length) {
      toast.message("Add a price after each name, or use Clean up with AI.");
      return;
    }
    setRows((current) => [...current, ...found].slice(0, 50));
    setPaste("");
  }

  async function cleanUp() {
    const local = splitPastedItems(paste);
    if (!aiReady) {
      if (local.length) {
        setRows((current) => [...current, ...local].slice(0, 50));
        setPaste("");
        toast.message("Added the lines that already have a price.");
      } else toast.error("A suggestion isn't available right now. You can type the items yourself.");
      return;
    }
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu/clean`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: paste })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(json.items) || json.items.length === 0) {
        throw new Error(json.error || "Could not clean that up. You can type the items yourself.");
      }
      setRows((current) => [...current, ...json.items.map(rowFromDraft)].slice(0, 50));
      setPaste("");
    } catch (err) {
      if (local.length) setRows((current) => [...current, ...local].slice(0, 50));
      toast.error(err instanceof Error ? err.message : "Could not clean that up. You can type the items yourself.");
    }
  }

  async function importFile(file: File) {
    if (file.size > 2_000_000) { toast.error("Choose a file under 2 MB"); return; }
    const body = new FormData();
    body.set("file", file);
    setBulkBusy(true); setBulkResult(null);
    const res = await fetch(`/api/businesses/${businessId}/menu/bulk`, { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    setBulkBusy(false);
    if (!res.ok || !Array.isArray(json.rows)) {
      toast.error(json.error || "Could not read that file");
      return;
    }
    const nextRows = json.rows as BulkPreviewRow[];
    setBulkCategories(Array.isArray(json.newCategories) ? json.newCategories : []);
    setBulkLimit(json.limit || null);
    setBulkRows(nextRows.map((row) => ({ ...row, action: row.matchedItemId || row.action === "skip" ? "skip" : "add" })));
  }

  function changeBulkMode(next: "add_new" | "update_existing") {
    setBulkMode(next);
    setBulkRows((current) => current.map((item) => ({
      ...item,
      action: item.action === "skip" && item.warnings.some((warning) => warning.includes("Duplicate name in this file"))
        ? "skip"
        : item.matchedItemId ? (next === "update_existing" ? "update" : "skip") : "add"
    })));
  }

  async function commitBulk() {
    const selected = bulkRows.filter((item) => item.action !== "skip" && bulkRowErrors(item.row).length === 0);
    if (!selected.length) { toast.error("Select at least one valid row to import"); return; }
    setBulkBusy(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/menu/bulk`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: bulkMode, rows: bulkRows.map((item) => item.row), actions: bulkRows.map((item, index) => ({ index, action: item.action })) })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not import these items");
      setBulkResult(json);
      setBulkRows([]);
      if (Array.isArray(json.imageJobs) && json.imageJobs.length) void pollImageJobs(json.imageJobs);
      toast.success("Bulk import finished");
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not import these items"); }
    finally { setBulkBusy(false); }
  }

  async function pollImageJobs(jobs: Array<{ jobId: string; rowIndex: number }>) {
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const complete = await checkImageJobs(jobs);
        if (complete) return;
      } catch { return; }
    }
  }

  async function checkImageJobs(jobs: Array<{ jobId: string; rowIndex: number }>) {
    const ids = jobs.map((job) => job.jobId).join(",");
    const res = await fetch(`/api/businesses/${businessId}/menu/bulk?imageJobIds=${encodeURIComponent(ids)}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return false;
    const failed = (json.jobs || []).filter((job: { status: string }) => job.status === "FAILED").map((job: { jobId: string; error?: string }) => ({
      rowIndex: jobs.find((row) => row.jobId === job.jobId)?.rowIndex ?? 0,
      error: job.error || "Image download failed"
    }));
    setBulkResult((current) => current ? { ...current, imageErrors: failed } : current);
    return json.jobs?.length === jobs.length && json.jobs.every((job: { status: string }) => job.status === "DONE" || job.status === "FAILED");
  }

  async function saveRows() {
    const invalid = rows.filter((row) => rowError(row));
    const valid = rows.filter((row) => !rowError(row));
    if (!valid.length) {
      toast.error(invalid.length ? rowError(invalid[0]) : "Add a row with a name and a price");
      return;
    }
    const batch = valid.slice(0, 50);
    const extra = valid.slice(50);
    const saved = await send({
      action: "items",
      items: batch.map((row) => ({
        name: row.name.trim(),
        priceRupees: Number(row.price),
        veg: normalizeVeg(row.veg) || "NONE",
        category: row.category.trim(),
        nameHi: row.nameHi.trim(),
        description: row.description.trim(),
        brand: row.brand.trim(),
        mrpRupees: row.mrp.trim() ? Number(row.mrp) : null,
        colour: row.colour.trim(),
        photo: row.photo,
        barcode: row.barcode.trim()
      }))
    }, true);
    if (!saved) return;
    const wrote = typeof saved.added === "number" ? saved.added : batch.length;
    setRows([...batch.slice(wrote), ...extra, ...invalid]);
  }

  return (
    <div className="space-y-3">
      <section className="space-y-3 rounded-xl border bg-white p-3 dark:bg-slate-950">
        <div><h3 className="font-semibold">Bulk upload</h3><p className="text-sm text-muted-foreground">Download a template or demo file, upload it, then review every row before import.</p></div>
        <div className="flex flex-wrap gap-2">
          <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=csv&kind=template`}>Download template · CSV</a>
          <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=xlsx&kind=template`}>Download template · Excel</a>
          <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=csv&kind=demo`}>Download demo file · CSV</a>
          <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=xlsx&kind=demo`}>Download demo file · Excel</a>
          <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy || bulkBusy} onClick={() => fileRef.current?.click()}>{bulkBusy ? "Preparing…" : "Upload CSV or Excel"}</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Upload CSV or Excel" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void importFile(file); }} />
        </div>
        {bulkRows.length ? <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">{bulkRows.length} rows · {bulkRows.filter((row) => !bulkRowErrors(row.row).length).length} valid · {bulkRows.filter((row) => row.action === "skip").length} marked to skip</p>
            <select aria-label="Existing item mode" value={bulkMode} onChange={(event) => changeBulkMode(event.target.value as "add_new" | "update_existing")} className="h-11 rounded-lg border bg-white px-3 text-sm">
              <option value="add_new">Add new · skip existing matches</option><option value="update_existing">Update existing matches</option>
            </select>
          </div>
          {bulkLimit ? <p className="text-sm text-muted-foreground">Plan items: {bulkLimit.used} / {bulkLimit.cap} · {bulkLimit.fits} rows fit. Items over your plan limit will be skipped.</p> : null}
          {bulkCategories.length ? <p className="text-sm text-muted-foreground">New categories: {bulkCategories.join(", ")}</p> : null}
          <p className="text-sm text-muted-foreground">Review errors, edit the row, or choose Skip.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-muted/50"><tr>{["Name", "Price ₹", "Category", "Veg", "Photo URL", "Errors / warnings", "Action"].map((heading) => <th key={heading} className="px-2 py-2 font-medium">{heading}</th>)}</tr></thead>
              <tbody>{bulkRows.map((item, index) => {
                const errors = bulkRowErrors(item.row);
                return <tr key={item.index} className={`border-t ${errors.length || item.errors.length ? "bg-red-50/70 dark:bg-red-950/20" : ""}`}>
                  <td className="p-2"><Input aria-label={`Bulk item name ${index + 1}`} value={item.row.name} className="h-11 min-h-11" onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, row: { ...row.row, name: event.target.value } } : row))} /></td>
                  <td className="p-2"><Input aria-label={`Bulk item price ${index + 1}`} value={item.row.price} className="h-11 min-h-11 w-28" onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, row: { ...row.row, price: event.target.value } } : row))} /></td>
                  <td className="p-2"><Input aria-label={`Bulk item category ${index + 1}`} value={item.row.category} className="h-11 min-h-11 w-36" onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, row: { ...row.row, category: event.target.value } } : row))} /></td>
                  <td className="p-2"><select aria-label={`Bulk item veg ${index + 1}`} value={item.row.veg || ""} onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, row: { ...row.row, veg: event.target.value } } : row))} className="h-11 rounded-lg border bg-white px-2"><option value="">—</option><option value="VEG">VEG</option><option value="NON_VEG">NON_VEG</option><option value="EGG">EGG</option></select></td>
                  <td className="p-2"><Input aria-label={`Bulk image URL ${index + 1}`} value={item.row.imageUrl} className="h-11 min-h-11 w-44" onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, row: { ...row.row, imageUrl: event.target.value } } : row))} /></td>
                  <td className="p-2"><div className="max-w-72 space-y-1">{[...new Set([...errors, ...item.warnings])].map((message) => <p key={message} className={errors.includes(message) ? "text-xs text-destructive" : "text-xs text-amber-700"}>{message}</p>)}</div></td>
                  <td className="p-2"><select aria-label={`Bulk row action ${index + 1}`} value={item.action} onChange={(event) => setBulkRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, action: event.target.value as BulkPreviewRow["action"] } : row))} className="h-11 rounded-lg border bg-white px-2"><option value="add">Add</option><option value="update" disabled={!item.matchedItemId}>Update</option><option value="skip">Skip</option></select></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          <Button type="button" className="h-11 min-h-11" disabled={busy || bulkBusy || !bulkRows.some((row) => row.action !== "skip" && !bulkRowErrors(row.row).length)} onClick={() => void commitBulk()}>{bulkBusy ? "Importing…" : "Import selected rows"}</Button>
        </div> : null}
        {bulkResult ? <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm"><p>{bulkResult.created} added · {bulkResult.updated} updated · {bulkResult.skipped} skipped · {bulkResult.failed} failed. {bulkResult.noPhoto} items have no photo.</p>{bulkResult.imageJobs?.length ? <Button type="button" variant="outline" className="h-11 min-h-11" onClick={() => void checkImageJobs(bulkResult.imageJobs!)}>Check photo links</Button> : null}{bulkResult.imageErrors?.map((image) => <p key={`${image.rowIndex}-${image.error}`} className="text-destructive">Row {image.rowIndex + 1}: {image.error}</p>)}</div> : null}
      </section>
      <div className="space-y-2">
        <textarea
          aria-label="Paste items"
          value={paste}
          rows={2}
          placeholder="Cappuccino 120, Latte 140"
          onChange={(event) => setPaste(event.target.value)}
          className="flex min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-sm"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={addLines}>
            Add these lines
          </Button>
          <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => void cleanUp()}>
            Clean up with AI
          </Button>
        </div>
      </div>
      {rows.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Check these items, then save. Nothing is added until you save.</p>
          {rows.map((row, index) => {
            const error = rowError(row);
            const number = index + 1;
            return (
              <div key={index} className="space-y-2 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-2">
                  <Input aria-label={`Draft name ${number}`} value={row.name} className="col-span-2 h-11 min-h-11" onChange={(event) => updateRow(index, { name: event.target.value })} />
                  <Input aria-label={`Draft price ${number}`} value={row.price} inputMode="decimal" className="h-11 min-h-11" onChange={(event) => updateRow(index, { price: event.target.value })} />
                  <Input aria-label={`Draft category ${number}`} value={row.category} className="h-11 min-h-11" onChange={(event) => updateRow(index, { category: event.target.value })} />
                  {layout === "FOOD" ? (
                    <select
                      aria-label={`Draft veg ${number}`}
                      value={normalizeVeg(row.veg) || "NONE"}
                      onChange={(event) => updateRow(index, { veg: event.target.value })}
                      className="col-span-2 flex h-11 w-full rounded-lg border bg-white px-3 text-sm"
                    >
                      <option value="VEG">Veg</option>
                      <option value="NON_VEG">Non-veg</option>
                      <option value="EGG">Egg</option>
                      <option value="NONE">No mark</option>
                    </select>
                  ) : null}
                  {layout === "SHOP" ? (
                    <Input aria-label={`Draft brand ${number}`} value={row.brand} placeholder="Brand" className="col-span-2 h-11 min-h-11" onChange={(event) => updateRow(index, { brand: event.target.value })} />
                  ) : null}
                </div>
                {error ? <p className="text-sm text-destructive">{error}</p> : null}
                <Button type="button" variant="outline" className="h-11 min-h-11" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>
                  Delete row {number}
                </Button>
              </div>
            );
          })}
          <Button type="button" className="h-11 min-h-11" disabled={busy} onClick={() => void saveRows()}>
            Save these items
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {STORE_TEMPLATES.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            className="h-11 min-h-11"
            disabled={busy}
            onClick={() => void send({ action: "template", templateId: template.id }, true)}
          >
            {template.name} template
          </Button>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreView } from "@/lib/store/layout";
import {
  blankRow,
  normalizeVeg,
  parseCsv,
  rowError,
  rowsFromTable,
  splitPastedItems,
  type EntryRow
} from "@/lib/store/entry";
import { STORE_TEMPLATES } from "@/lib/store/templates";

export type MenuSave = false | { added?: number; message?: string; variantId?: string };

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
  const fileRef = React.useRef<HTMLInputElement>(null);

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
    const isCsv = /\.csv$/i.test(file.name) || file.type.includes("csv") || file.type.startsWith("text/");
    if (isCsv) {
      setRows(parseCsv(await file.text()).slice(0, 200));
      return;
    }
    const body = new FormData();
    body.set("file", file);
    const res = await fetch(`/api/businesses/${businessId}/menu/sheet`, { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(json.rows)) {
      toast.error(json.error || "Could not read that spreadsheet");
      return;
    }
    setRows(rowsFromTable(json.rows).slice(0, 200));
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=csv`}>
          CSV template
        </a>
        <a className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border px-3 text-sm font-medium" href={`/api/businesses/${businessId}/menu/sheet?format=xlsx`}>
          Excel template
        </a>
        <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={() => fileRef.current?.click()}>
          Import spreadsheet
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Import spreadsheet"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importFile(file);
          }}
        />
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

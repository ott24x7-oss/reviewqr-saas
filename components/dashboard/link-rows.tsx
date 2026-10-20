"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LINK_TYPES, type StoredLink } from "@/lib/tap/presets";

export function LinkRows({
  links,
  onChange,
  canEdit
}: {
  links: StoredLink[];
  onChange: (links: StoredLink[]) => void;
  canEdit: boolean;
}) {
  const fine = useFinePointer();
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);

  function update(index: number, patch: Partial<StoredLink>) {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function move(index: number, target: number) {
    if (target < 0 || target >= links.length || target === index) return;
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(next.map((link, sort) => ({ ...link, sort: (sort + 1) * 10 })));
  }

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <article
          key={link.key}
          className="rounded-xl border p-3 space-y-2"
          draggable={canEdit && fine}
          onDragStart={() => setDragFrom(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => {
            if (dragFrom == null) return;
            move(dragFrom, index);
            setDragFrom(null);
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={link.enabled}
                disabled={!canEdit}
                onChange={(event) => update(index, { enabled: event.target.checked })}
              />
              Show
            </label>
            {fine && canEdit ? <span className="text-xs text-muted-foreground">Drag to reorder</span> : null}
          </div>
          <select
            aria-label="Button type"
            value={link.type}
            disabled={!canEdit}
            onChange={(event) => update(index, { type: event.target.value as StoredLink["type"] })}
            className="flex h-11 w-full rounded-lg border border-border bg-white px-3 text-sm"
          >
            {LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input aria-label="English label" value={link.labelEn} disabled={!canEdit} onChange={(event) => update(index, { labelEn: event.target.value })} />
            <Input aria-label="Hindi label" value={link.labelHi} disabled={!canEdit} onChange={(event) => update(index, { labelHi: event.target.value })} />
          </div>
          <Input aria-label="Link" value={link.url} disabled={!canEdit} placeholder="https://, tel:, or upi://pay" onChange={(event) => update(index, { url: event.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input aria-label="Emoji" value={link.emoji} disabled={!canEdit} placeholder="Emoji" onChange={(event) => update(index, { emoji: event.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={link.featured}
                disabled={!canEdit}
                onChange={(event) => update(index, { featured: event.target.checked })}
              />
              Featured
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              aria-label="Show from"
              type="time"
              value={link.schedule?.from || ""}
              disabled={!canEdit}
              onChange={(event) => update(index, { schedule: clock(event.target.value, link.schedule?.to || "") })}
            />
            <Input
              aria-label="Show until"
              type="time"
              value={link.schedule?.to || ""}
              disabled={!canEdit}
              onChange={(event) => update(index, { schedule: clock(link.schedule?.from || "", event.target.value) })}
            />
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => move(index, index - 1)}>
                Up
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => move(index, index + 1)}>
                Down
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onChange(links.filter((_, i) => i !== index))}>
                Delete
              </Button>
            </div>
          )}
        </article>
      ))}
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onChange([
              ...links,
              {
                key: `link-${Date.now().toString(36)}`,
                type: "custom",
                labelEn: "New link",
                labelHi: "",
                enabled: false,
                sort: links.length * 10 + 10,
                featured: false,
                url: "",
                emoji: "",
                schedule: null
              }
            ])
          }
        >
          Add button
        </Button>
      )}
    </div>
  );
}

function clock(from: string, to: string): StoredLink["schedule"] {
  if (!from && !to) return null;
  return { from, to };
}

function useFinePointer() {
  const [fine, setFine] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const apply = () => setFine(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return fine;
}

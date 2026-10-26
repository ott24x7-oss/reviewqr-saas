"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppText, useAppLanguage } from "@/components/app-ui/i18n";

export function CustomerTags({ id, tags, canManage }: { id: string; tags: string[]; canManage: boolean }) {
  const { text } = useAppLanguage();
  const [value, setValue] = React.useState(tags.join(", "));
  const [busy, setBusy] = React.useState(false);

  if (!canManage) return <span className="text-sm">{tags.join(", ") || "—"}</span>;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags: value })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : text("Could not save tags", "टैग सहेजे नहीं जा सके"));
        return;
      }
      if (Array.isArray(json.tags)) setValue(json.tags.join(", "));
      toast.success(text("Tags saved", "टैग सहेज दिए गए"));
    } catch {
      toast.error(text("Could not save tags", "टैग सहेजे नहीं जा सके"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        aria-label="Tags"
        value={value}
        placeholder={text("VIP, regular", "VIP, नियमित")}
        className="h-11 min-h-11 min-w-0 flex-1"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
      />
      <Button type="button" variant="outline" className="h-11 min-h-11" disabled={busy} onClick={save}>
        <AppText en="Save" hi="सहेजें" />
      </Button>
    </div>
  );
}

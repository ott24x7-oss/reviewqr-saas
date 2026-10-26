"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LinkRows } from "@/components/dashboard/link-rows";
import { Button } from "@/components/admin/ui/controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin/ui/controls";
import { Input } from "@/components/admin/ui/controls";
import { Label } from "@/components/admin/ui/controls";
import { normalizeLinks } from "@/lib/tap/page-draft";
import { CODE_PRESETS, type StoredLink } from "@/lib/tap/presets";

export function PresetForm({
  code,
  saved
}: {
  code: { industry: string; links: StoredLink[] }[];
  saved: { industry: string; links: unknown }[];
}) {
  const router = useRouter();
  const [industry, setIndustry] = React.useState("cafe");
  const [links, setLinks] = React.useState<StoredLink[]>(CODE_PRESETS.cafe);
  const [busy, setBusy] = React.useState(false);

  function load(nextIndustry: string, raw: unknown) {
    const parsed = normalizeLinks(raw);
    setIndustry(nextIndustry);
    setLinks(!("error" in parsed) && parsed.links.length ? parsed.links : CODE_PRESETS[nextIndustry] || CODE_PRESETS.other);
  }

  async function send(remove = false) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ industry, links, remove })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the preset");
      toast.success(remove ? "Preset removed" : "Preset saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the preset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Saved</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {code.map((preset) => (
            <button key={preset.industry} type="button" className="block min-h-11 text-left text-sm underline" onClick={() => load(preset.industry, preset.links)}>
              Built-in {preset.industry}
            </button>
          ))}
          {saved.map((preset) => (
            <button key={`saved-${preset.industry}`} type="button" className="block min-h-11 text-left text-sm underline" onClick={() => load(preset.industry, preset.links)}>
              Saved {preset.industry}
            </button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Edit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Industry</Label>
            <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
          </div>
          <LinkRows links={links} onChange={setLinks} canEdit />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={busy} onClick={() => send(false)}>
              Save preset
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => send(true)}>
              Remove saved preset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

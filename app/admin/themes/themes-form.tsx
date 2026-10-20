"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ThemePreset } from "@/lib/tap/themes";

export function AdminThemesForm({ presets, extra }: { presets: ThemePreset[]; extra: ThemePreset[] }) {
  const router = useRouter();
  const [id, setId] = React.useState("");
  const [name, setName] = React.useState("");
  const [premium, setPremium] = React.useState(false);
  const [bg, setBg] = React.useState("#ffffff");
  const [ink, setInk] = React.useState("#1c1b18");
  const [busy, setBusy] = React.useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the theme");
      toast.success(body.remove ? "Theme removed" : "Theme saved");
      if (!body.remove) {
        setId("");
        setName("");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the theme");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Built-in</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {presets.map((theme) => (
            <span
              key={theme.id}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
            >
              <span aria-hidden className="h-8 w-8 shrink-0 rounded-full border border-border" style={{ background: theme.tokens.background }} />
              {theme.name}
              {theme.premium ? " · Paid" : ""}
            </span>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Extra theme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Id</Label>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="monsoon" />
          </div>
          <div>
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monsoon" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} />
            Paid plans only
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Background</Label>
              <Input value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Text</Label>
              <Input value={ink} onChange={(e) => setInk(e.target.value)} />
            </div>
          </div>
          <Button type="button" disabled={busy} onClick={() => send({ id, name, premium, bg, ink })}>
            Save extra theme
          </Button>
          {extra.length > 0 && (
            <ul className="space-y-2 pt-2">
              {extra.map((theme) => (
                <li key={theme.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {theme.name} <span className="text-muted-foreground">({theme.id})</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => send({ id: theme.id, name: theme.name, premium: theme.premium, bg: theme.tokens.bg, ink: theme.tokens.ink, remove: true })}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

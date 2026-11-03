"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/admin/ui/controls";
import type { ImageAiConfig } from "@/lib/settings";

export function ImageAiForm({ initial }: { initial: ImageAiConfig }) {
  const [cfg, setCfg] = React.useState(initial);
  const [keyTouched, setKeyTouched] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [testUrl, setTestUrl] = React.useState("");
  function set<K extends keyof ImageAiConfig>(key: K, value: ImageAiConfig[K]) {
    setCfg((current) => ({ ...current, [key]: value }));
  }
  function body(includeKey = true) {
    const data: Partial<ImageAiConfig> = { ...cfg };
    if (!includeKey || !keyTouched) delete data.apiKey;
    return data;
  }
  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/image-ai", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body())
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save image AI settings");
      toast.success("Image AI settings saved");
      setKeyTouched(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setTestUrl("");
    try {
      const res = await fetch("/api/admin/settings/image-ai/test", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body())
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Image generation test failed");
      setTestUrl(json.url); toast.success("Sample image generated");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image test failed"); }
    finally { setBusy(false); }
  }
  return (
    <Card>
      <CardHeader><CardTitle>Image AI</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={cfg.enabled} onChange={(event) => set("enabled", event.target.checked)} />
          <span><span className="font-medium">Enable admin item photo generation</span><span className="block text-xs text-muted-foreground">Only admins can request and approve images.</span></span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Images API base URL</Label><Input value={cfg.apiUrl} onChange={(event) => set("apiUrl", event.target.value)} placeholder="https://api.openai.com/v1" /></div>
          <div><Label>Model</Label><Input value={cfg.model} onChange={(event) => set("model", event.target.value)} placeholder="gpt-image-1" /></div>
          <div><Label>API key</Label><Input type="password" value={keyTouched ? cfg.apiKey : ""} onChange={(event) => { setKeyTouched(true); set("apiKey", event.target.value); }} placeholder={keyTouched ? "Enter API key" : "Leave blank to keep the stored key"} /></div>
          <div><Label>Image size</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cfg.size} onChange={(event) => set("size", event.target.value)}><option value="1024x1024">1024 × 1024</option><option value="1536x1024">1536 × 1024</option><option value="1024x1536">1024 × 1536</option></select></div>
          <div><Label>Estimated cost per image (paise)</Label><Input type="number" min={0} value={cfg.estimatePaisePerImage} onChange={(event) => set("estimatePaisePerImage", Math.max(0, Number(event.target.value || 0)))} /></div>
          <div><Label>Daily cap (paise)</Label><Input type="number" min={0} value={cfg.dailyCapPaise} onChange={(event) => set("dailyCapPaise", Math.max(0, Number(event.target.value || 0)))} /></div>
        </div>
        <div><Label>Style prompt</Label><textarea className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm" value={cfg.stylePrompt} onChange={(event) => set("stylePrompt", event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Product name and details are included. Business name, shop brand, logos, and text are excluded from the generated image request.</p></div>
        {testUrl ? <div className="flex items-center gap-3"><img src={testUrl} alt="Generated sample product photo" className="h-24 w-24 rounded-lg border object-cover" /><span className="text-sm">Sample generated successfully.</span></div> : null}
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => void test()}>{busy ? "Working…" : "Test image generation"}</Button><Button type="button" variant="gradient" disabled={busy} onClick={() => void save()}>{busy ? "Working…" : "Save image settings"}</Button></div>
      </CardContent>
    </Card>
  );
}

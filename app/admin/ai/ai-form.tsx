"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Sparkles } from "lucide-react";
import type { AiConfig } from "@/lib/settings";

const PRESETS: Array<{ label: string; apiUrl: string; model: string }> = [
  { label: "OpenRouter", apiUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { label: "OpenAI", apiUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Groq", apiUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" }
];

export function AiConfigForm({ initial }: { initial: AiConfig }) {
  const [cfg, setCfg] = React.useState<AiConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [keyTouched, setKeyTouched] = React.useState(false);

  function update<K extends keyof AiConfig>(k: K, v: AiConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...cfg };
      if (!keyTouched) delete body.apiKey; // keep the stored key if untouched
      const res = await fetch("/api/admin/settings/ai", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("AI settings saved");
      setKeyTouched(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={cfg.enabled}
              onChange={(e) => update("enabled", e.target.checked)}
            />
            <span>
              <span className="font-medium">Enable AI review assistant</span>
              <span className="block text-xs text-muted-foreground">
                Master switch. Each business must also opt in from its own AI Reviews page.
              </span>
            </span>
          </label>

          <div className="pt-2 border-t">
            <Label className="text-xs">Quick presets</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    update("apiUrl", p.apiUrl);
                    update("model", p.model);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-white hover:border-foreground/40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">API base URL</Label>
            <Input
              value={cfg.apiUrl}
              onChange={(e) => update("apiUrl", e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The OpenAI-compatible base — we call <code>{"{base}/chat/completions"}</code>.
            </p>
          </div>

          <div>
            <Label className="text-xs">Model</Label>
            <Input
              value={cfg.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="openai/gpt-4o-mini"
            />
          </div>

          <div>
            <Label className="text-xs">API key</Label>
            <Input
              type="password"
              value={cfg.apiKey}
              onChange={(e) => {
                setKeyTouched(true);
                update("apiKey", e.target.value);
              }}
              placeholder={keyTouched ? "" : "Leave unchanged to keep current key"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save AI settings
        </Button>
      </div>
    </div>
  );
}

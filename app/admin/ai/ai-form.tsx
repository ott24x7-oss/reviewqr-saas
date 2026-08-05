"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Search, Plug, CheckCircle2, XCircle } from "lucide-react";
import type { AiConfig } from "@/lib/settings";
import { cn } from "@/lib/utils";

const PRESETS: Array<{ label: string; apiUrl: string; model: string }> = [
  { label: "OpenRouter", apiUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { label: "OpenAI", apiUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Groq", apiUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" }
];

export function AiConfigForm({ initial }: { initial: AiConfig }) {
  const [cfg, setCfg] = React.useState<AiConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [keyTouched, setKeyTouched] = React.useState(false);
  const [models, setModels] = React.useState<string[]>([]);
  const [detecting, setDetecting] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; msg: string } | null>(null);

  function update<K extends keyof AiConfig>(k: K, v: AiConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  // Only send the key when the admin actually typed a new one — otherwise the
  // server falls back to the stored key (the field shows a masked placeholder).
  function connBody() {
    const b: any = { apiUrl: cfg.apiUrl, model: cfg.model };
    if (keyTouched) b.apiKey = cfg.apiKey;
    return b;
  }

  async function detectModels() {
    setDetecting(true);
    try {
      const res = await fetch("/api/admin/settings/ai/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(connBody())
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to detect models");
      const list: string[] = j.models || [];
      setModels(list);
      if (list.length && !list.includes(cfg.model)) update("model", list[0]);
      toast.success(`${list.length} model${list.length === 1 ? "" : "s"} detected`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDetecting(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(connBody())
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "Connection failed");
      setTestResult({ ok: true, msg: `Connected — “${cfg.model}” replied “${j.reply}”.` });
      toast.success("AI connection works");
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
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
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-white dark:bg-slate-900 hover:border-foreground/40"
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
            <div className="flex items-center justify-between">
              <Label className="text-xs">Model</Label>
              <button
                type="button"
                onClick={detectModels}
                disabled={detecting}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 dark:text-primary-300 hover:underline disabled:opacity-50"
              >
                {detecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
                Auto-detect
              </button>
            </div>
            <Input
              list="ai-models"
              value={cfg.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="openai/gpt-4o-mini"
            />
            {models.length > 0 && (
              <datalist id="ai-models">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {models.length > 0
                ? `✓ ${models.length} models available — type to search the list.`
                : "Model id to use. Click Auto-detect to pull the provider's list."}
            </p>
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

      {testResult && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-xl border p-3 text-sm",
            testResult.ok
              ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              : "border-rose-200 dark:border-red-500/30 bg-rose-50 dark:bg-red-500/15 text-rose-800 dark:text-red-300"
          )}
        >
          {testResult.ok ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{testResult.msg}</span>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
        <Button onClick={testConnection} disabled={testing} variant="outline" size="lg">
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          Test connection
        </Button>
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save AI settings
        </Button>
      </div>
    </div>
  );
}

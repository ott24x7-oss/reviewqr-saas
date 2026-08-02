"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Send } from "lucide-react";
import type { WhatsAppConfig, WhatsAppProvider } from "@/lib/settings";
import { cn } from "@/lib/utils";

const PROVIDERS: Array<{
  id: WhatsAppProvider;
  title: string;
  sub: string;
}> = [
  {
    id: "click-to-chat",
    title: "Click-to-chat",
    sub: "wa.me URL — manual send"
  },
  {
    id: "cloud-api",
    title: "Cloud API",
    sub: "Official Meta — needs business approval"
  },
  {
    id: "baileys",
    title: "Baileys",
    sub: "Unofficial — pair with QR below"
  }
];

export function WhatsAppConfigForm({ initial }: { initial: WhatsAppConfig }) {
  const [cfg, setCfg] = React.useState<WhatsAppConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testTo, setTestTo] = React.useState("");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function update<K extends keyof WhatsAppConfig>(k: K, v: WhatsAppConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setTouched((t) => ({ ...t, [k]: true }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...cfg };
      if (!touched.apiToken) delete body.apiToken;
      const res = await fetch("/api/admin/settings/whatsapp", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("WhatsApp config saved");
      setTouched({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) {
      toast.error("Enter a phone number");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testTo })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Send failed");
      if (j.via === "click-to-chat") {
        window.open(j.url, "_blank");
        toast.success("Click-to-chat opened in a new tab");
      } else {
        toast.success(`Sent via ${j.via}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Send provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const active = cfg.provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update("provider", p.id)}
                  className={cn(
                    "text-left rounded-xl border p-3 transition",
                    active
                      ? "border-brand ring-2 ring-brand/20 bg-brand/10"
                      : "border-border hover:border-brand/40"
                  )}
                >
                  <div className="font-semibold text-sm">{p.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.sub}</div>
                </button>
              );
            })}
          </div>

          <label className="flex items-start gap-2 text-sm pt-2 border-t border-border">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={cfg.notifyPositiveCopy}
              onChange={(e) => update("notifyPositiveCopy", e.target.checked)}
            />
            <span>
              <span className="font-medium">Notify owner when a customer copies a 4–5★ review</span>
              <span className="block text-xs text-muted-foreground">
                Sends a WhatsApp to the business owner's number with the exact text the customer
                took to Google.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {cfg.provider === "cloud-api" && (
        <Card>
          <CardHeader>
            <CardTitle>Cloud API credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">API URL</Label>
              <Input value={cfg.apiUrl} onChange={(e) => update("apiUrl", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Phone number ID</Label>
              <Input
                value={cfg.phoneId}
                onChange={(e) => update("phoneId", e.target.value)}
                placeholder="e.g. 1234567890"
              />
            </div>
            <div>
              <Label className="text-xs">Access token</Label>
              <Input
                type="password"
                value={cfg.apiToken}
                onChange={(e) => update("apiToken", e.target.value)}
                placeholder={touched.apiToken ? "" : "Leave unchanged to keep current"}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Send test message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Phone (10 digit Indian or full international)"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <Button onClick={sendTest} disabled={testing} variant="outline">
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Save settings first if you've changed the provider — the test uses the saved config.
            For Baileys, make sure it's connected (panel below).
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save WhatsApp settings
        </Button>
      </div>
    </div>
  );
}

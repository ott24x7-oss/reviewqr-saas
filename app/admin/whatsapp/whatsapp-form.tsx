"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import type { WhatsAppConfig } from "@/lib/settings";

export function WhatsAppConfigForm({ initial }: { initial: WhatsAppConfig }) {
  const [cfg, setCfg] = React.useState<WhatsAppConfig>(initial);
  const [saving, setSaving] = React.useState(false);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cloud API</CardTitle>
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
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} variant="gradient">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

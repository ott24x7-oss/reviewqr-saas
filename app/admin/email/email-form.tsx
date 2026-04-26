"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Send } from "lucide-react";
import type { EmailConfig } from "@/lib/settings";

export function EmailConfigForm({ initial }: { initial: EmailConfig }) {
  const [cfg, setCfg] = React.useState<EmailConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testTo, setTestTo] = React.useState("");
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function update<K extends keyof EmailConfig>(k: K, v: EmailConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setTouched((t) => ({ ...t, [k]: true }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...cfg };
      for (const k of ["smtpPass", "relaySecret"] as const) {
        if (!touched[k]) delete body[k];
      }
      const res = await fetch("/api/admin/settings/email", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Email config saved");
      setTouched({});
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!testTo) {
      toast.error("Enter a recipient email");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: testTo })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Send failed");
      toast.success(`Sent via ${j.via || "unknown"}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>PHP mailer relay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Recommended for Railway deploys (bypasses outbound SMTP block). Drop the matching{" "}
            <code>send.php</code> on a normal PHP host.
          </p>
          <div>
            <Label className="text-xs">Relay URL</Label>
            <Input
              value={cfg.relayUrl}
              onChange={(e) => update("relayUrl", e.target.value)}
              placeholder="https://your-host.com/mailer/send.php"
            />
          </div>
          <div>
            <Label className="text-xs">Shared secret</Label>
            <Input
              type="password"
              value={cfg.relaySecret}
              onChange={(e) => update("relaySecret", e.target.value)}
              placeholder={touched.relaySecret ? "" : "Leave unchanged to keep current"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SMTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Used directly when no relay is set, and forwarded to the relay when one is configured.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-xs">Host</Label>
              <Input
                value={cfg.smtpHost}
                onChange={(e) => update("smtpHost", e.target.value)}
                placeholder="smtp.resend.com"
              />
            </div>
            <div>
              <Label className="text-xs">Port</Label>
              <Input
                type="number"
                value={cfg.smtpPort}
                onChange={(e) => update("smtpPort", Number(e.target.value || 587))}
              />
            </div>
            <div>
              <Label className="text-xs">User</Label>
              <Input
                value={cfg.smtpUser}
                onChange={(e) => update("smtpUser", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Password / API key</Label>
              <Input
                type="password"
                value={cfg.smtpPass}
                onChange={(e) => update("smtpPass", e.target.value)}
                placeholder={touched.smtpPass ? "" : "Leave unchanged to keep current"}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">From address</Label>
              <Input
                value={cfg.smtpFrom}
                onChange={(e) => update("smtpFrom", e.target.value)}
                placeholder="ReviewQR <noreply@yourdomain.com>"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Send test email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <Button onClick={sendTest} disabled={testing} variant="outline">
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Save your config first if you've made changes — the test uses the saved config.
          </p>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save email config
        </Button>
      </div>
    </div>
  );
}

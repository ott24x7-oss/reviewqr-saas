"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import type { SiteConfig, TurnstileConfig } from "@/lib/settings";

export function SiteForm({
  site: initSite,
  turnstile: initTs
}: {
  site: SiteConfig;
  turnstile: TurnstileConfig;
}) {
  const [site, setSite] = React.useState(initSite);
  const [ts, setTs] = React.useState(initTs);
  const [saving, setSaving] = React.useState(false);
  const [tsTouched, setTsTouched] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const tsBody: any = { ...ts };
      if (!tsTouched) delete tsBody.secretKey;

      const [r1, r2] = await Promise.all([
        fetch("/api/admin/settings/site", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(site)
        }),
        fetch("/api/admin/settings/turnstile", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(tsBody)
        })
      ]);
      if (!r1.ok || !r2.ok) throw new Error("Save failed");
      toast.success("Site settings saved");
      setTsTouched(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">App name</Label>
            <Input
              value={site.appName}
              onChange={(e) => setSite({ ...site, appName: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Public app URL</Label>
            <Input
              value={site.appUrl}
              onChange={(e) => setSite({ ...site, appUrl: e.target.value })}
              placeholder="https://review.yourdomain.com"
            />
          </div>
          <div>
            <Label className="text-xs">Support email</Label>
            <Input
              type="email"
              value={site.supportEmail}
              onChange={(e) => setSite({ ...site, supportEmail: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Marketing tagline</Label>
            <Textarea
              rows={2}
              value={site.marketingTagline}
              onChange={(e) => setSite({ ...site, marketingTagline: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access & maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={site.signupsEnabled}
              onChange={(e) => setSite({ ...site, signupsEnabled: e.target.checked })}
            />
            Allow new signups
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={site.maintenanceMode}
              onChange={(e) => setSite({ ...site, maintenanceMode: e.target.checked })}
            />
            Maintenance mode (show banner to all users)
          </label>
          <div>
            <Label className="text-xs">Maintenance message</Label>
            <Textarea
              rows={2}
              value={site.maintenanceMessage}
              onChange={(e) => setSite({ ...site, maintenanceMessage: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cloudflare Turnstile (bot protection)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Site key (public)</Label>
            <Input
              value={ts.siteKey}
              onChange={(e) => {
                setTs({ ...ts, siteKey: e.target.value });
                setTsTouched(true);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Secret key</Label>
            <Input
              type="password"
              value={ts.secretKey}
              onChange={(e) => {
                setTs({ ...ts, secretKey: e.target.value });
                setTsTouched(true);
              }}
              placeholder="Leave unchanged to keep current"
            />
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save site settings
        </Button>
      </div>
    </div>
  );
}

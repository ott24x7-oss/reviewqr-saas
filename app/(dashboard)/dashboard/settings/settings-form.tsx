"use client";
import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionTier } from "@prisma/client";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    whiteLabelEnabled: boolean;
    whiteLabelName: string;
    whiteLabelDomain: string;
    whiteLabelColor: string;
    tier: SubscriptionTier;
  };
};

export function SettingsForm({ user }: Props) {
  const [form, setForm] = React.useState({
    name: user.name,
    phone: user.phone,
    whiteLabelEnabled: user.whiteLabelEnabled,
    whiteLabelName: user.whiteLabelName,
    whiteLabelDomain: user.whiteLabelDomain,
    whiteLabelColor: user.whiteLabelColor
  });
  const [loading, setLoading] = React.useState(false);

  function update<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((s) => ({ ...s, [key]: val }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) toast.success("Settings saved!");
      else toast.error("Failed to save");
    } finally {
      setLoading(false);
    }
  }

  const canWhiteLabel = user.tier === "AGENCY";

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            White-label
            {!canWhiteLabel && <Badge variant="warning">Agency plan only</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="wlEnabled"
              checked={form.whiteLabelEnabled}
              onChange={(e) => update("whiteLabelEnabled", e.target.checked)}
              disabled={!canWhiteLabel}
              className="h-4 w-4"
            />
            <Label htmlFor="wlEnabled">Enable white-label branding</Label>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wlName">Brand name</Label>
            <Input
              id="wlName"
              value={form.whiteLabelName}
              onChange={(e) => update("whiteLabelName", e.target.value)}
              disabled={!canWhiteLabel}
              placeholder="Acme Reviews"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wlDomain">Custom domain</Label>
            <Input
              id="wlDomain"
              value={form.whiteLabelDomain}
              onChange={(e) => update("whiteLabelDomain", e.target.value)}
              disabled={!canWhiteLabel}
              placeholder="reviews.youragency.com"
            />
            <p className="text-xs text-muted-foreground">
              Add a CNAME record pointing to your-app.up.railway.app and we'll handle SSL.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wlColor">Brand colour</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="wlColor"
                value={form.whiteLabelColor}
                onChange={(e) => update("whiteLabelColor", e.target.value)}
                disabled={!canWhiteLabel}
                className="h-10 w-14 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={form.whiteLabelColor}
                onChange={(e) => update("whiteLabelColor", e.target.value)}
                disabled={!canWhiteLabel}
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" variant="gradient" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

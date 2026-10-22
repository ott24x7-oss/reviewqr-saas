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
import { createApiClient } from "@reviewqr/shared";

const api = createApiClient();

function WhatsAppChange({ current, onChanged }: { current: string; onChanged: (phone: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function requestCode() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "request", phone })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send a code");
      setSent(true);
      toast.success(json.channel === "email" ? "Code sent by email." : "Code sent on WhatsApp.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "verify", phone, code })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Invalid code");
      onChanged(json.phone || phone);
      setOpen(false);
      setSent(false);
      setCode("");
      setPhone("");
      toast.success("WhatsApp number updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Change WhatsApp number
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <p className="text-xs text-muted-foreground">
        Current: {current || "Not set"}. We send a code to the new number.
      </p>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Input
        value={phone}
        inputMode="tel"
        autoComplete="tel"
        placeholder="98xxxxxxxx"
        onChange={(event) => setPhone(event.target.value)}
        disabled={sent}
      />
      {sent ? (
        <div className="space-y-2">
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            aria-label="6-digit code"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <Button type="button" size="sm" disabled={busy || code.length !== 6} onClick={() => void confirm()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm new number
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" disabled={busy || phone.replace(/\D/g, "").length < 10} onClick={() => void requestCode()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send code
        </Button>
      )}
      <button
        type="button"
        className="text-xs text-muted-foreground"
        onClick={() => {
          setOpen(false);
          setError("");
          setSent(false);
        }}
      >
        Cancel
      </button>
    </div>
  );
}

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
    pushEnabled: boolean;
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
  const [pushEnabled, setPushEnabled] = React.useState(user.pushEnabled);
  const [pushSaving, setPushSaving] = React.useState(false);

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

  async function onPush(checked: boolean) {
    const previous = pushEnabled;
    setPushEnabled(checked);
    setPushSaving(true);
    try {
      const res = await api.request("/api/v1/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pushEnabled: checked })
      });
      if (!res.ok) {
        setPushEnabled(previous);
        toast.error("Could not update notifications");
      }
    } finally {
      setPushSaving(false);
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
              <Label htmlFor="phone">WhatsApp</Label>
              <Input id="phone" value={form.phone || "Not set"} disabled readOnly />
              <WhatsAppChange
                current={form.phone}
                onChanged={(phone) => update("phone", phone)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              role="switch"
              id="pushEnabled"
              checked={pushEnabled}
              disabled={pushSaving}
              onChange={(e) => onPush(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="pushEnabled">Push notifications for orders, feedback, and plan reminders</Label>
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
                className="h-10 w-14 rounded-lg border cursor-pointer"
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

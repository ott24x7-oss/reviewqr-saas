"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import type { PaymentsConfig } from "@/lib/settings";

export function PaymentsConfigForm({ initial }: { initial: PaymentsConfig }) {
  const [cfg, setCfg] = React.useState<PaymentsConfig>(initial);
  const [saving, setSaving] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function update<K extends keyof PaymentsConfig>(k: K, v: PaymentsConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setTouched((t) => ({ ...t, [k]: true }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: any = { ...cfg };
      // Don't overwrite secrets if untouched (form shows masked value)
      for (const k of [
        "razorpayKeySecret",
        "razorpayWebhookSecret",
        "stripeSecretKey",
        "stripeWebhookSecret"
      ] as const) {
        if (!touched[k]) delete body[k];
      }
      const res = await fetch("/api/admin/settings/payments", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Payments config saved");
      setTouched({});
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
          <CardTitle>Razorpay (India)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Key ID</Label>
            <Input
              value={cfg.razorpayKeyId}
              onChange={(e) => update("razorpayKeyId", e.target.value)}
              placeholder="rzp_live_… or rzp_test_…"
            />
          </div>
          <div>
            <Label className="text-xs">Key secret</Label>
            <Input
              type="password"
              value={cfg.razorpayKeySecret}
              onChange={(e) => update("razorpayKeySecret", e.target.value)}
              placeholder={touched.razorpayKeySecret ? "" : "Leave unchanged to keep current"}
            />
          </div>
          <div>
            <Label className="text-xs">Webhook secret</Label>
            <Input
              type="password"
              value={cfg.razorpayWebhookSecret}
              onChange={(e) => update("razorpayWebhookSecret", e.target.value)}
              placeholder={touched.razorpayWebhookSecret ? "" : "Leave unchanged to keep current"}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cfg.razorpayLive}
              onChange={(e) => update("razorpayLive", e.target.checked)}
            />
            Live mode (uncheck for test)
          </label>
          <p className="text-xs text-muted-foreground">
            Webhook URL: <code className="text-[11px]">/api/billing/razorpay/webhook</code>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe (international fallback)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Publishable key</Label>
            <Input
              value={cfg.stripePublishableKey}
              onChange={(e) => update("stripePublishableKey", e.target.value)}
              placeholder="pk_live_… or pk_test_…"
            />
          </div>
          <div>
            <Label className="text-xs">Secret key</Label>
            <Input
              type="password"
              value={cfg.stripeSecretKey}
              onChange={(e) => update("stripeSecretKey", e.target.value)}
              placeholder={touched.stripeSecretKey ? "" : "Leave unchanged to keep current"}
            />
          </div>
          <div>
            <Label className="text-xs">Webhook secret</Label>
            <Input
              type="password"
              value={cfg.stripeWebhookSecret}
              onChange={(e) => update("stripeWebhookSecret", e.target.value)}
              placeholder={touched.stripeWebhookSecret ? "" : "Leave unchanged to keep current"}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>UPI (manual)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">UPI ID</Label>
            <Input
              value={cfg.upiId}
              onChange={(e) => update("upiId", e.target.value)}
              placeholder="business@paytm"
            />
          </div>
          <div>
            <Label className="text-xs">Payee name</Label>
            <Input
              value={cfg.upiPayeeName}
              onChange={(e) => update("upiPayeeName", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Button onClick={save} disabled={saving} variant="gradient" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save payment settings
        </Button>
      </div>
    </div>
  );
}

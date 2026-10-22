"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShippingConfig } from "@/lib/shop/shipping";

const SECRETS = ["shiprocketPassword", "delhiveryToken", "webhookSecret"] as const;

export function ShippingForm({ initial, status }: { initial: ShippingConfig; status: string }) {
  const router = useRouter();
  const [cfg, setCfg] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  function update<K extends keyof ShippingConfig>(key: K, value: ShippingConfig[K]) {
    setCfg((current) => ({ ...current, [key]: value }));
    setTouched((current) => ({ ...current, [key]: true }));
  }

  async function save() {
    setSaving(true);
    try {
      const body: Partial<ShippingConfig> = { ...cfg, pickup: cfg.pickup, presets: cfg.presets };
      for (const key of SECRETS) {
        if (!touched[key]) delete body[key];
      }
      const response = await fetch("/api/admin/settings/shipping", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Save failed");
      toast.success("Shipping saved");
      setTouched({});
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[20px]">
        <CardHeader>
          <CardTitle>Carrier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="carrier">Carrier</Label>
            <select
              id="carrier"
              className="flex h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
              value={cfg.provider}
              onChange={(event) => update("provider", event.target.value as ShippingConfig["provider"])}
            >
              <option value="mock">Mock carrier</option>
              <option value="shiprocket">Shiprocket</option>
              <option value="delhivery">Delhivery</option>
            </select>
            <p className="text-sm text-muted-foreground">{status === "Not configured" ? "Not configured. Save keys before a live booking." : status}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shiprocket-email">Shiprocket email</Label>
            <Input id="shiprocket-email" value={cfg.shiprocketEmail} onChange={(event) => update("shiprocketEmail", event.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shiprocket-password">Shiprocket password</Label>
            <Input
              id="shiprocket-password"
              type="password"
              value={cfg.shiprocketPassword}
              onChange={(event) => update("shiprocketPassword", event.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delhivery-token">Delhivery token</Label>
            <Input id="delhivery-token" type="password" value={cfg.delhiveryToken} onChange={(event) => update("delhiveryToken", event.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-secret">Webhook secret</Label>
            <Input id="webhook-secret" type="password" value={cfg.webhookSecret} onChange={(event) => update("webhookSecret", event.target.value)} autoComplete="new-password" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[20px]">
        <CardHeader>
          <CardTitle>Pickup address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["name", "Contact name"],
              ["phone", "Phone"],
              ["line1", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"]
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`pickup-${key}`}>{label}</Label>
              <Input
                id={`pickup-${key}`}
                value={cfg.pickup[key]}
                onChange={(event) => update("pickup", { ...cfg.pickup, [key]: event.target.value })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[20px]">
        <CardHeader>
          <CardTitle>Packaging presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cfg.presets.map((preset, index) => (
            <div key={preset.id} className="grid gap-3 sm:grid-cols-5">
              <div className="space-y-2 sm:col-span-5">
                <Label htmlFor={`${preset.id}-name`}>{preset.name}</Label>
                <Input
                  id={`${preset.id}-name`}
                  value={preset.name}
                  onChange={(event) => {
                    const presets = cfg.presets.slice();
                    presets[index] = { ...preset, name: event.target.value };
                    update("presets", presets);
                  }}
                />
              </div>
              {(
                [
                  ["lengthMm", "Length mm"],
                  ["widthMm", "Width mm"],
                  ["heightMm", "Height mm"],
                  ["weightGrams", "Weight g"]
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`${preset.id}-${key}`}>{label}</Label>
                  <Input
                    id={`${preset.id}-${key}`}
                    inputMode="numeric"
                    value={preset[key]}
                    onChange={(event) => {
                      const presets = cfg.presets.slice();
                      presets[index] = { ...preset, [key]: Math.floor(Number(event.target.value)) };
                      update("presets", presets);
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
          <Button type="button" onClick={save} disabled={saving} className="rounded-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save shipping
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

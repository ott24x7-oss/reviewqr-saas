"use client";
import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Sparkles } from "lucide-react";
import type { PricingConfig } from "@/lib/settings";
import type { SubscriptionTier } from "@prisma/client";

const TIERS: SubscriptionTier[] = ["FREE", "STARTER", "GROWTH", "AGENCY"];

export function PricingForm({ initial }: { initial: PricingConfig }) {
  const [plans, setPlans] = React.useState<PricingConfig>(initial);
  const [saving, setSaving] = React.useState(false);

  function update<T extends keyof PricingConfig[SubscriptionTier]>(
    tier: SubscriptionTier,
    key: T,
    value: PricingConfig[SubscriptionTier][T]
  ) {
    setPlans((p) => ({ ...p, [tier]: { ...p[tier], [key]: value } }));
  }

  function updateLimit(
    tier: SubscriptionTier,
    key: keyof PricingConfig[SubscriptionTier]["limits"],
    value: number
  ) {
    setPlans((p) => ({
      ...p,
      [tier]: { ...p[tier], limits: { ...p[tier].limits, [key]: value } }
    }));
  }

  function setHighlighted(tier: SubscriptionTier) {
    setPlans((p) => {
      const out = { ...p };
      for (const t of TIERS) out[t] = { ...out[t], highlighted: t === tier };
      return out;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(plans)
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Save failed");
      toast.success("Pricing updated");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TIERS.map((tier) => {
          const p = plans[tier];
          return (
            <Card key={tier}>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="flex items-center gap-2">
                  {p.name || tier}
                  {p.highlighted && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold">
                      <Sparkles className="h-2.5 w-2.5" /> Highlighted
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={p.visible}
                      onChange={(e) => update(tier, "visible", e.target.checked)}
                    />
                    Visible
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs">
                    <input
                      type="radio"
                      name="highlighted"
                      checked={!!p.highlighted}
                      onChange={() => setHighlighted(tier)}
                    />
                    Popular
                  </label>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Display name</Label>
                    <Input
                      value={p.name}
                      onChange={(e) => update(tier, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tagline</Label>
                    <Input
                      value={p.tagline}
                      onChange={(e) => update(tier, "tagline", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Monthly (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={Math.round(p.monthly / 100)}
                      onChange={(e) =>
                        update(tier, "monthly", Math.max(0, Number(e.target.value || 0)) * 100)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Yearly (₹)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={Math.round(p.yearly / 100)}
                      onChange={(e) =>
                        update(tier, "yearly", Math.max(0, Number(e.target.value || 0)) * 100)
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Features (one per line)</Label>
                  <Textarea
                    rows={6}
                    value={p.features.join("\n")}
                    onChange={(e) =>
                      update(
                        tier,
                        "features",
                        e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>

                <div>
                  <Label className="text-xs">Plan limits</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
                    {(["businesses", "locations", "staff", "qrCodes", "reviews"] as const).map(
                      (k) => (
                        <div key={k}>
                          <Label className="text-[10px] uppercase">{k}</Label>
                          <Input
                            type="number"
                            min={0}
                            value={p.limits[k]}
                            onChange={(e) =>
                              updateLimit(tier, k, Math.max(0, Number(e.target.value || 0)))
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="sticky bottom-3 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" variant="gradient">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save pricing
        </Button>
      </div>
    </div>
  );
}

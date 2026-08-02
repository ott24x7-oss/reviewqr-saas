"use client";
import * as React from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PricingConfig } from "@/lib/settings";
import { formatINR, cn } from "@/lib/utils";
import type { SubscriptionTier } from "@prisma/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function BillingClient({
  currentTier,
  plans
}: {
  currentTier: SubscriptionTier;
  plans: PricingConfig;
}) {
  const [annual, setAnnual] = React.useState(true);
  const [loading, setLoading] = React.useState<SubscriptionTier | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("razorpay-checkout")) return;
    const s = document.createElement("script");
    s.id = "razorpay-checkout";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  async function upgrade(tier: SubscriptionTier) {
    setLoading(tier);
    try {
      const res = await fetch("/api/billing/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, period: annual ? "yearly" : "monthly" })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to start checkout");
        return;
      }
      if (!window.Razorpay) {
        toast.error("Razorpay not loaded yet — try again in a moment");
        return;
      }
      const rzp = new window.Razorpay({
        key: json.keyId,
        amount: json.amount,
        currency: "INR",
        name: "ReviewQR",
        description: `${json.plan} plan (${annual ? "yearly" : "monthly"})`,
        order_id: json.orderId,
        theme: { color: "#1a73e8" },
        handler: async (response: any) => {
          const verify = await fetch("/api/billing/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            })
          });
          const v = await verify.json();
          if (verify.ok) {
            toast.success("Plan upgraded! Refreshing...");
            setTimeout(() => window.location.reload(), 1500);
          } else {
            toast.error(v.error || "Verification failed");
          }
        }
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  const tiers = (["FREE", "STARTER", "GROWTH", "AGENCY"] as const).filter(
    (k) => plans[k].visible
  );

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold">Choose a plan</h2>
            <p className="text-sm text-muted-foreground">Pay via Razorpay (UPI / cards / wallets)</p>
          </div>
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-elevated">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition",
                !annual ? "bg-surface shadow-neu-sm text-ink" : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1",
                annual ? "bg-surface shadow-neu-sm text-ink" : "text-muted-foreground"
              )}
            >
              Yearly
              <span className="px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-[9px] font-bold">
                -17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tiers.map((tierKey) => {
            const tier = plans[tierKey];
            const price = annual ? tier.yearly : tier.monthly;
            const isCurrent = currentTier === tierKey;
            const isHighlighted = !!tier.highlighted;

            return (
              <div
                key={tierKey}
                className={cn(
                  "relative rounded-xl border border-border p-4 flex flex-col",
                  isHighlighted && "bg-brand/10 border-brand/40"
                )}
              >
                {isHighlighted && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full gradient-brand text-white text-[10px] font-bold">
                    <Sparkles className="h-2.5 w-2.5" /> Popular
                  </span>
                )}
                <div>
                  <h3 className="font-semibold">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                </div>
                <div className="mt-3">
                  {price === 0 ? (
                    <div className="text-2xl font-bold">Free</div>
                  ) : (
                    <div>
                      <div className="text-2xl font-bold">{formatINR(price)}</div>
                      <div className="text-xs text-muted-foreground">
                        per {annual ? "year" : "month"}
                      </div>
                    </div>
                  )}
                </div>
                <ul className="mt-3 space-y-1.5 flex-1 text-xs">
                  {tier.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button disabled variant="outline" size="sm" className="mt-3 w-full">
                    Current plan
                  </Button>
                ) : tier.tier === "FREE" ? (
                  <Button disabled variant="outline" size="sm" className="mt-3 w-full">
                    Free
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={isHighlighted ? "gradient" : "default"}
                    className="mt-3 w-full"
                    onClick={() => upgrade(tier.tier)}
                    disabled={loading !== null}
                  >
                    {loading === tier.tier ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

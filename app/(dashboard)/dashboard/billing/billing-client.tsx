"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Sparkles,
  Copy,
  Smartphone,
  QrCode,
  Wallet,
  X,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PricingConfig } from "@/lib/settings";
import { formatINR, cn } from "@/lib/utils";
import type { SubscriptionTier } from "@prisma/client";

type PayMethod = "upi" | "usdt";

type Order = {
  id: string;
  method: PayMethod;
  tier: SubscriptionTier;
  months: number;
  amountInrDisplay: string;
  amountUsdt: number | null;
  expiresAt: string;
  upi?: { id: string; payee: string; qr?: string; link: string };
  usdt?: { address: string; network: string };
};

type OrderStatus = "PENDING" | "COMPLETED" | "FAILED";

function useCopy() {
  const [copied, setCopied] = React.useState<string | null>(null);
  const copy = React.useCallback(async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  }, []);
  return { copied, copy };
}

function CopyField({
  value,
  label,
  copyKey,
  copied,
  onCopy
}: {
  value: string;
  label?: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-muted-foreground">{label}</div>}
      <div className="flex items-stretch gap-1.5">
        <code className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-mono break-all">
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => onCopy(value, copyKey)}
          aria-label="Copy"
        >
          {copied === copyKey ? (
            <Check className="h-3.5 w-3.5 text-accent" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

function PaymentModal({
  tier,
  tierName,
  months,
  upiEnabled,
  usdtEnabled,
  onClose
}: {
  tier: SubscriptionTier;
  tierName: string;
  months: number;
  upiEnabled: boolean;
  usdtEnabled: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { copied, copy } = useCopy();
  const [creating, setCreating] = React.useState<PayMethod | null>(null);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [reference, setReference] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [status, setStatus] = React.useState<OrderStatus>("PENDING");
  const [expired, setExpired] = React.useState(false);

  const anyEnabled = upiEnabled || usdtEnabled;

  async function createOrder(method: PayMethod) {
    setCreating(method);
    try {
      const res = await fetch("/api/billing/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, months, method })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't create order");
        return;
      }
      setOrder(json as Order);
      setStatus("PENDING");
      setExpired(false);
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setCreating(null);
    }
  }

  // Poll for status while an order is open and still pending.
  React.useEffect(() => {
    if (!order || status !== "PENDING" || expired) return;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/api/billing/order/${order!.id}`, {
          cache: "no-store"
        });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.status === "COMPLETED") {
          setStatus("COMPLETED");
          router.refresh();
        } else if (json.status === "FAILED") {
          setStatus("FAILED");
        }
      } catch {
        /* transient — keep polling */
      }
    }

    check();
    const interval = setInterval(check, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [order, status, expired, router]);

  // Expiry watcher.
  React.useEffect(() => {
    if (!order || status !== "PENDING") return;
    const expiresAt = new Date(order.expiresAt).getTime();
    function tick() {
      if (Date.now() >= expiresAt) setExpired(true);
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [order, status]);

  async function submitReference() {
    if (!order) return;
    if (!reference.trim()) {
      toast.error("Please enter your reference");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/order/${order.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reference: reference.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't submit reference");
        return;
      }
      if (json.status === "COMPLETED") {
        setStatus("COMPLETED");
        router.refresh();
      } else if (json.status === "FAILED") {
        setStatus("FAILED");
      } else {
        toast.success("Reference received — verifying your payment…");
      }
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const isUpi = order?.method === "upi";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-background border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sticky top-0 bg-background">
          <div className="flex items-center gap-2">
            {order && status === "PENDING" && !expired && (
              <button
                onClick={() => {
                  setOrder(null);
                  setReference("");
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="font-semibold">
              Upgrade to {tierName}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({months === 12 ? "yearly" : "monthly"})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* SUCCESS */}
          {status === "COMPLETED" ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-4xl">🎉</div>
              <h3 className="text-lg font-semibold">Plan activated!</h3>
              <p className="text-sm text-muted-foreground">
                Your {tierName} plan is now active. Enjoy!
              </p>
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : status === "FAILED" || expired ? (
            /* FAILED / EXPIRED */
            <div className="text-center py-6 space-y-3">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-base font-semibold">
                {status === "FAILED" ? "Payment could not be verified" : "This order expired"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Please start again to generate a fresh order.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setOrder(null);
                  setReference("");
                  setStatus("PENDING");
                  setExpired(false);
                }}
              >
                Start again
              </Button>
            </div>
          ) : !order ? (
            /* STEP 1 — choose method */
            <div className="space-y-3">
              {!anyEnabled ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Online payments aren't set up yet — contact support.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Choose how you'd like to pay:</p>
                  {upiEnabled && (
                    <button
                      onClick={() => createOrder("upi")}
                      disabled={creating !== null}
                      className="w-full flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-primary hover:bg-secondary/50 transition disabled:opacity-60"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {creating === "upi" ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Smartphone className="h-5 w-5" />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium text-sm">UPI</span>
                        <span className="block text-xs text-muted-foreground">
                          GPay, PhonePe, Paytm & any UPI app
                        </span>
                      </span>
                    </button>
                  )}
                  {usdtEnabled && (
                    <button
                      onClick={() => createOrder("usdt")}
                      disabled={creating !== null}
                      className="w-full flex items-center gap-3 rounded-xl border border-border p-3.5 text-left hover:border-primary hover:bg-secondary/50 transition disabled:opacity-60"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {creating === "usdt" ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Wallet className="h-5 w-5" />
                        )}
                      </span>
                      <span>
                        <span className="block font-medium text-sm">USDT (crypto)</span>
                        <span className="block text-xs text-muted-foreground">
                          Pay with Tether stablecoin
                        </span>
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            /* STEP 2 — pay details */
            <div className="space-y-4">
              {isUpi ? (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-bold">₹{order.amountInrDisplay}</div>
                    <p className="mt-1 text-sm font-bold text-amber-600">
                      Pay the EXACT amount ₹{order.amountInrDisplay} so we can auto-verify it.
                    </p>
                  </div>

                  {order.upi?.qr && (
                    <div className="flex flex-col items-center gap-1.5">
                      <img
                        src={order.upi.qr}
                        alt="UPI QR code"
                        className="h-44 w-44 rounded-lg border border-border bg-white p-2"
                      />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <QrCode className="h-3 w-3" /> Scan to pay
                      </span>
                    </div>
                  )}

                  {order.upi && (
                    <>
                      <CopyField
                        label="UPI ID"
                        value={order.upi.id}
                        copyKey="upi-id"
                        copied={copied}
                        onCopy={copy}
                      />
                      <div className="text-xs text-muted-foreground">
                        Payee: <span className="font-medium text-foreground">{order.upi.payee}</span>
                      </div>
                      <a href={order.upi.link}>
                        <Button className="w-full" variant="gradient">
                          <Smartphone className="h-4 w-4 mr-1.5" /> Pay with any UPI app
                        </Button>
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-bold">{order.amountUsdt} USDT</div>
                    {order.usdt && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        <Wallet className="h-3 w-3" /> {order.usdt.network} network
                      </span>
                    )}
                    <p className="mt-2 text-sm font-bold text-amber-600">
                      Send EXACTLY {order.amountUsdt} USDT on the {order.usdt?.network} network.
                    </p>
                  </div>
                  {order.usdt && (
                    <CopyField
                      label="Wallet address"
                      value={order.usdt.address}
                      copyKey="usdt-addr"
                      copied={copied}
                      onCopy={copy}
                    />
                  )}
                </>
              )}

              {/* Reference input */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <Label htmlFor="pay-ref">
                  {isUpi ? "UPI reference / UTR" : "Transaction hash"}
                </Label>
                <Input
                  id="pay-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={isUpi ? "e.g. 4012XXXXXXXX" : "0x…"}
                  className="font-mono"
                />
                <Button
                  className="w-full"
                  onClick={submitReference}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "I've paid — verify now"
                  )}
                </Button>
              </div>

              {/* Polling indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verifying your payment…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function BillingClient({
  currentTier,
  plans,
  upiEnabled,
  usdtEnabled
}: {
  currentTier: SubscriptionTier;
  plans: PricingConfig;
  upiEnabled: boolean;
  usdtEnabled: boolean;
}) {
  const [annual, setAnnual] = React.useState(true);
  const [modalTier, setModalTier] = React.useState<SubscriptionTier | null>(null);

  const tiers = (["FREE", "STARTER", "GROWTH", "AGENCY"] as const).filter(
    (k) => plans[k].visible
  );

  const months = annual ? 12 : 1;

  return (
    <>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-semibold">Choose a plan</h2>
              <p className="text-sm text-muted-foreground">Pay securely via UPI or USDT</p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-secondary">
              <button
                onClick={() => setAnnual(false)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition",
                  !annual
                    ? "bg-white dark:bg-slate-900 shadow text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition flex items-center gap-1",
                  annual
                    ? "bg-white dark:bg-slate-900 shadow text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Yearly
                <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-800 text-[9px] font-bold">
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
                    "relative rounded-xl border dark:border-slate-800 p-4 flex flex-col",
                    isHighlighted && "ring-2 ring-primary"
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
                      onClick={() => setModalTier(tier.tier)}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {modalTier && (
        <PaymentModal
          tier={modalTier}
          tierName={plans[modalTier].name}
          months={months}
          upiEnabled={upiEnabled}
          usdtEnabled={usdtEnabled}
          onClose={() => setModalTier(null)}
        />
      )}
    </>
  );
}

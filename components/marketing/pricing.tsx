"use client";
import * as React from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/payments";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/utils";

export function Pricing() {
  const [annual, setAnnual] = React.useState(true);
  const tiers = (["FREE", "STARTER", "GROWTH", "AGENCY"] as const).map((t) => PLANS[t]);

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-secondary/30">
      <div className="container max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-accent-50 text-accent-700 text-sm font-medium">
            Pricing
          </span>
          <h2 className="section-title mt-4 font-display">
            Honest, <span className="gradient-text">India-priced</span> plans
          </h2>
          <p className="section-sub mt-4">
            Start free. Upgrade only when you grow. No long-term contracts. GST invoice provided.
          </p>

          <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-white border shadow-soft">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                !annual ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                annual ? "bg-primary text-white" : "text-muted-foreground"
              )}
            >
              Yearly
              <span className="px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-800 text-[10px] font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {tiers.map((tier) => {
            const price = annual ? tier.yearly : tier.monthly;
            const isHighlighted = !!tier.highlighted;
            return (
              <div
                key={tier.tier}
                className={cn(
                  "relative rounded-2xl border bg-white p-6 sm:p-7 flex flex-col transition-all hover:shadow-card",
                  isHighlighted && "ring-2 ring-primary shadow-glow scale-100 lg:scale-[1.03]"
                )}
              >
                {isHighlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full gradient-brand text-white text-xs font-bold shadow-md">
                    <Sparkles className="h-3 w-3" /> Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-display font-bold text-xl">{tier.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>
                </div>

                <div className="mt-5">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">Free</span>
                      <span className="text-sm text-muted-foreground">forever</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{formatINR(price)}</span>
                      <span className="text-sm text-muted-foreground">/{annual ? "year" : "mo"}</span>
                    </div>
                  )}
                  {annual && price > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      ≈ {formatINR(Math.round(price / 12))}/mo
                    </div>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isHighlighted ? "gradient" : tier.tier === "FREE" ? "outline" : "default"}
                  size="lg"
                  className="mt-6 w-full"
                  asChild
                >
                  <Link href={tier.tier === "FREE" ? "/register" : `/register?plan=${tier.tier.toLowerCase()}`}>
                    {tier.tier === "FREE" ? "Start Free" : tier.tier === "AGENCY" ? "Talk to sales" : "Start trial"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          All plans include UPI / Razorpay billing · GST invoice · 14-day money-back guarantee
        </p>
      </div>
    </section>
  );
}

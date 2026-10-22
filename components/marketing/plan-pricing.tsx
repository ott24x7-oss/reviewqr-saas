"use client";

import * as React from "react";
import { DURATION_LABELS, MODULES, PRICING_TABS, type PricingTab } from "@/lib/plans/catalog";
import type { PublicPlan } from "@/lib/plans/public";
import { PriceCard } from "@/components/plans/price-card";
import { cn } from "@/lib/utils";

const moduleName = (id: string, hindi: boolean) => {
  const found = MODULES.find((item) => item.id === id);
  if (!found) return id;
  return hindi ? found.nameHi : found.nameEn;
};

export function PlanPricing({ plans }: { plans: PublicPlan[] }) {
  const [hindi, setHindi] = React.useState(false);
  const [tab, setTab] = React.useState<PricingTab>("reviews");
  const [duration, setDuration] = React.useState<(typeof plans)[number]["prices"][number]["duration"]>("YEAR_1");
  const visible = plans.filter((plan) => plan.tab === tab);

  return (
    <section id="pricing" className="py-16 sm:py-24">
      <div className="container max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 flex justify-end">
            <button type="button" className="text-sm font-medium underline" onClick={() => setHindi((value) => !value)}>
              {hindi ? "English" : "हिन्दी"}
            </button>
          </div>
          <h2 className="section-title font-display">{hindi ? "प्लान चुनें" : "Choose a plan"}</h2>
          <p className="section-sub mt-3">
            {hindi
              ? "एक मॉड्यूल या कॉम्बो। कीमत एडमिन सेट करता है। GST इनवॉइस मिलता है।"
              : "One module or a combo. Prices are set by the admin. A GST invoice is included."}
          </p>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {PRICING_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                tab === item.id ? "bg-primary text-primary-foreground" : "bg-white"
              )}
            >
              {hindi ? item.hi : item.en}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(["MONTH_1", "MONTH_6", "YEAR_1", "LIFETIME"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setDuration(id)}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                duration === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              )}
            >
              {hindi ? DURATION_LABELS[id].hi : DURATION_LABELS[id].en}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">{hindi ? "इस ग्रुप में अभी कोई प्लान नहीं है।" : "No plan in this group yet."}</p>
          ) : (
            visible.map((plan) => {
              const price = plan.prices.find((row) => row.duration === duration);
              const label = hindi ? DURATION_LABELS[duration].hi : DURATION_LABELS[duration].en;
              return (
                <div key={plan.slug} data-plan={plan.slug}>
                  <PriceCard
                    name={hindi ? plan.nameHi : plan.nameEn}
                    description={hindi ? plan.descriptionHi : plan.descriptionEn}
                    badge={plan.badge}
                    pricePaise={price?.pricePaise ?? 0}
                    mrpPaise={price?.mrpPaise}
                    periodLabel={price ? label : hindi ? "इस अवधि पर उपलब्ध नहीं" : "Not offered for this duration"}
                    savings={price?.savings}
                    modules={plan.modules.map((id) => moduleName(id, hindi))}
                    href={price ? `/register?plan=${encodeURIComponent(plan.slug)}&duration=${duration}` : undefined}
                    cta={price && price.pricePaise > 0 ? (hindi ? "शुरू करें" : "Get started") : hindi ? "शामिल" : "Included"}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

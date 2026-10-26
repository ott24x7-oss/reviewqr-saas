"use client";

import { Check } from "lucide-react";
import { pick, useLandingLang } from "@/components/marketing/landing-v2/lang";
import type { PublicPlan } from "@/lib/plans/public";

/** Plan-versus-plan matrix. A row exists only when a plan marks that bullet for the table. */
export function PlanCompare({ plans }: { plans: PublicPlan[] }) {
  const { lang } = useLandingLang();
  const rows: { en: string; hi: string }[] = [];
  for (const plan of plans) {
    for (const bullet of plan.bullets) {
      if (!bullet.compare) continue;
      if (rows.some((row) => row.en === bullet.en)) continue;
      rows.push({ en: bullet.en, hi: bullet.hi });
    }
  }
  if (!plans.length || !rows.length) return null;

  return (
    <section id="plan-compare" className="py-12 sm:py-16">
      <div className="container max-w-6xl px-4">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{pick(lang, "Compare plans", "प्लान तुलना")}</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl bg-white/90 ring-1 ring-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="px-4 py-3 font-bold">{pick(lang, "Feature", "फ़ीचर")}</th>
                {plans.map((plan) => (
                  <th key={plan.slug} className="px-3 py-3 text-center font-bold">
                    {lang === "hi" ? plan.nameHi : plan.nameEn}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.en} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-ink/85">{pick(lang, row.en, row.hi)}</td>
                  {plans.map((plan) => {
                    const on = plan.bullets.some((bullet) => bullet.compare && bullet.en === row.en);
                    return (
                      <td key={plan.slug} className="px-3 py-3 text-center">
                        {on ? (
                          <Check className="mx-auto h-4 w-4 text-primary-600" aria-label={pick(lang, "Included", "शामिल")} />
                        ) : (
                          <span className="text-muted-ink" aria-label={pick(lang, "Not included", "शामिल नहीं")}>
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

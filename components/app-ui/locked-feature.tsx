"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { featureById } from "@reviewqr/shared";
import { AppText } from "./i18n";
import type { LockedFeatureState } from "@/lib/plans/dashboard-gate";

export function LockedFeature({ state, compact = false }: { state: LockedFeatureState; compact?: boolean }) {
  const feature = featureById(state.featureId);
  if (!feature) return null;
  const plans = state.plans;

  return (
    <section className={`app-ui-panel ${compact ? "p-4" : "mx-auto w-full max-w-2xl p-5 sm:p-8"}`} aria-labelledby="locked-feature-title">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 id="locked-feature-title" className="text-lg font-semibold sm:text-xl">
            <AppText en={feature.labelEn} hi={feature.labelHi} />
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            <AppText en={`Your plan doesn't include ${feature.labelEn}.`} hi={`आपके प्लान में ${feature.labelHi} शामिल नहीं है।`} />
          </p>
          {plans.length ? (
            <div className="mt-5">
              <h2 className="text-sm font-medium"><AppText en="Included in these plans" hi="इन प्लान में शामिल" /></h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {plans.map((plan) => (
                  <li key={plan.slug}>
                    <Link href={`/plans/${plan.slug}`} className="inline-flex min-h-8 items-center rounded-full border bg-card px-3 text-sm hover:bg-muted">
                      <AppText en={plan.nameEn} hi={plan.nameHi || plan.nameEn} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground"><AppText en="See the current plans to find an option that includes this feature." hi="इस सुविधा वाला विकल्प देखने के लिए मौजूदा प्लान देखें।" /></p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/dashboard/billing" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              <AppText en="See plans" hi="प्लान देखें" /><ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted">
              <ArrowLeft className="h-4 w-4" /><AppText en="Back" hi="वापस" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

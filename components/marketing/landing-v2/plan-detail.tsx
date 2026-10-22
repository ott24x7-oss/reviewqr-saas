"use client";

import * as React from "react";
import Link from "next/link";
import type { PlanDuration } from "@prisma/client";
import { DURATION_LABELS, MODULES } from "@/lib/plans/catalog";
import type { PublicPlan } from "@/lib/plans/public";
import type { StandAddon } from "@/lib/landing/hardware";
import { formatRupees } from "@/lib/landing/money";
import { DURATION_CHIPS, buyHref, fallbackImageName, planAudience, planTicks } from "@/lib/plans/categories";
import { LandingPicture } from "./picture";
import { pick, useLandingLang } from "./lang";

const FAQ = [
  {
    en: "Can I pick a different duration?",
    hi: "क्या मैं अलग अवधि चुन सकता हूँ?",
    bodyEn: "Yes. Choose 1 month, 6 months, 1 year, or lifetime. Checkout uses the price saved on that plan.",
    bodyHi: "हाँ। 1 महीना, 6 महीने, 1 साल या लाइफटाइम चुनें। चेकआउट उसी प्लान की सेव की हुई कीमत लेता है।"
  },
  {
    en: "Do you take a commission on WhatsApp orders?",
    hi: "क्या WhatsApp ऑर्डर पर कमीशन लगता है?",
    bodyEn: "No. Orders go to your own WhatsApp number.",
    bodyHi: "नहीं। ऑर्डर आपके अपने WhatsApp नंबर पर जाते हैं।"
  },
  {
    en: "Do I have to buy a stand?",
    hi: "क्या स्टैंड खरीदना ज़रूरी है?",
    bodyEn: "No. You can download the QR. A printed QR + NFC stand is optional from the shop.",
    bodyHi: "नहीं। QR डाउनलोड कर सकते हैं। प्रिंटेड QR + NFC स्टैंड दुकान से वैकल्पिक है।"
  }
];

export function PlanDetail({
  plan,
  hardware,
  initialDuration
}: {
  plan: PublicPlan;
  hardware: StandAddon[];
  initialDuration: string | undefined;
}) {
  const { lang } = useLandingLang();
  const match = plan.prices.find((price) => price.duration === initialDuration) || plan.prices[0];
  const [duration, setDuration] = React.useState<PlanDuration | undefined>(match?.duration);
  const selected = plan.prices.find((price) => price.duration === duration) || plan.prices[0];
  const name = lang === "hi" ? plan.nameHi : plan.nameEn;
  const description = lang === "hi" ? plan.descriptionHi || plan.descriptionEn : plan.descriptionEn;
  const alt = pick(lang, `${name} product photo`, `${name} की तस्वीर`);
  const ticks = planTicks(plan.category);
  const audience = planAudience(plan.category);
  const modules = plan.modules
    .map((id) => MODULES.find((item) => item.id === id))
    .filter((item): item is (typeof MODULES)[number] => Boolean(item));

  if (!selected) return null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 pb-28">
      <p className="text-sm">
        <Link href="/#pricing" className="underline">
          {pick(lang, "All plans", "सभी प्लान")}
        </Link>
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-[24px] bg-[var(--marketing-sand)]">
          {plan.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={plan.imageUrl} alt={alt} width={1200} height={1200} className="aspect-square w-full object-cover" />
          ) : (
            <LandingPicture name={fallbackImageName(plan.category)} alt={alt} width={1200} height={1200} priority sizes="(max-width: 1023px) 100vw, 50vw" className="aspect-square w-full object-cover" />
          )}
        </div>
        <div>
          {plan.badge ? <p className="text-xs font-semibold uppercase tracking-wide">{plan.badge}</p> : null}
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-[-0.03em]">{name}</h1>
          {description ? <p className="mt-3 text-sm leading-relaxed text-[var(--marketing-muted)]">{description}</p> : null}
          <p className="mt-4 text-sm font-semibold">{pick(lang, "Who it is for", "यह किसके लिए है")}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {audience.map((item) => (
              <li key={item.en} className="rounded-full border border-[var(--marketing-line)] px-3 py-1 text-sm">
                {lang === "hi" ? item.hi : item.en}
              </li>
            ))}
          </ul>
          <p className="marketing-rupee mt-5 text-2xl font-semibold" data-price data-duration={selected.duration}>
            {formatRupees(selected.pricePaise)}
            {selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? (
              <span className="ml-2 text-base font-normal text-[var(--marketing-muted)] line-through">
                {formatRupees(selected.mrpPaise)}
              </span>
            ) : null}
            {selected.savings > 0 ? <span className="ml-2 text-sm">{selected.savings}% off</span> : null}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.prices.map((price) => {
              const on = price.duration === selected.duration;
              const label = DURATION_LABELS[price.duration];
              return (
                <button
                  key={price.duration}
                  type="button"
                  data-duration={price.duration}
                  aria-pressed={on}
                  onClick={() => setDuration(price.duration)}
                  className={`min-h-11 rounded-full px-3 text-sm font-semibold ${on ? "bg-[var(--marketing-ink)] text-[var(--marketing-bg)]" : "border border-[var(--marketing-line)]"}`}
                >
                  {lang === "hi" ? label.hi : label.en}
                </button>
              );
            })}
          </div>
          <a href={buyHref(plan.slug, selected.duration)} className="marketing-cta mt-4 hidden justify-center sm:inline-flex">
            {pick(lang, "Buy now", "अभी खरीदें")}
          </a>
          <h2 className="mt-8 text-lg font-semibold">{pick(lang, "What's included", "क्या शामिल है")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {ticks.map((tick) => (
              <li key={tick.en}>{lang === "hi" ? tick.hi : tick.en}</li>
            ))}
            {modules.map((item) => (
              <li key={item.id}>{lang === "hi" ? item.blurbHi : item.blurbEn}</li>
            ))}
          </ul>
        </div>
      </div>

      {hardware.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">{pick(lang, "Add a stand", "स्टैंड जोड़ें")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {hardware.map((item) => (
              <article key={item.slug} className="rounded-[20px] border border-[var(--marketing-line)] p-3">
                <p className="text-sm font-semibold">{lang === "hi" ? item.nameHi : item.name}</p>
                <p className="marketing-rupee mt-1 text-sm">{formatRupees(item.salePaise)}</p>
                <Link href="/dashboard/shop" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline">
                  {pick(lang, "View in shop", "दुकान में देखें")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 max-w-2xl">
        <h2 className="text-lg font-semibold">{pick(lang, "Questions", "सवाल")}</h2>
        <div className="mt-3 divide-y divide-[var(--marketing-line)]">
          {FAQ.map((item) => (
            <details key={item.en} className="py-3">
              <summary className="cursor-pointer text-sm font-semibold">{lang === "hi" ? item.hi : item.en}</summary>
              <p className="mt-2 text-sm text-[var(--marketing-muted)]">{lang === "hi" ? item.bodyHi : item.bodyEn}</p>
            </details>
          ))}
        </div>
      </section>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--marketing-line)] bg-[var(--marketing-bg)] px-3 pt-2 sm:hidden"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <p className="marketing-rupee min-w-0 flex-1 truncate text-sm font-semibold">
            {formatRupees(selected.pricePaise)}
            <span className="ml-1 font-normal text-[var(--marketing-muted)]">
              {lang === "hi" ? DURATION_CHIPS[selected.duration].hi : DURATION_CHIPS[selected.duration].en}
            </span>
          </p>
          <a href={buyHref(plan.slug, selected.duration)} className="marketing-cta inline-flex justify-center">
            {pick(lang, "Buy now", "अभी खरीदें")}
          </a>
        </div>
      </div>
    </article>
  );
}

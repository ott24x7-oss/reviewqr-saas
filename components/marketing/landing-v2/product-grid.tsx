"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PlanDuration } from "@prisma/client";
import type { PublicPlan } from "@/lib/plans/public";
import type { StandAddon } from "@/lib/landing/hardware";
import { formatRupees } from "@/lib/landing/money";
import {
  DURATION_CHIPS,
  PLAN_CATEGORIES,
  buyHref,
  planCategory,

  type PlanCategory
} from "@/lib/plans/categories";
import { assignCardImages, pictureNameFromSrc } from "@/lib/landing/card-images";
import { LandingPicture } from "./picture";
import { pick, useLandingLang } from "./lang";

function PlanPhoto({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  const name = pictureNameFromSrc(src);
  if (!name) {
    return (
      // Admin uploads may be a data URL or another host, which next/image will not serve.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} width={1200} height={1200} className="h-full w-full object-cover" loading="lazy" />
    );
  }
  return (
    <LandingPicture name={name} alt={alt} width={1200} height={1200} sizes={sizes} className="h-full w-full object-cover" />
  );
}

function ProductCard({ plan, imageSrc, className = "" }: { plan: PublicPlan; imageSrc: string; className?: string }) {
  const { lang } = useLandingLang();
  const initial = (plan.prices.find((price) => price.duration === "MONTH_1") || plan.prices[0])?.duration;
  const [duration, setDuration] = React.useState<PlanDuration | undefined>(initial);
  const selected = plan.prices.find((price) => price.duration === duration) || plan.prices[0];
  if (!selected) return null;
  const ticks = plan.bullets;
  const name = lang === "hi" ? plan.nameHi : plan.nameEn;
  const alt = pick(lang, `${name} product photo`, `${name} की तस्वीर`);
  const off = selected.savings;

  return (
    <article
      data-plan-card={plan.slug}
      data-card-image={imageSrc}
      className={`flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-[var(--marketing-line)] bg-white/80 ${className}`}
    >
      <Link href={`/plans/${plan.slug}`} className="relative block aspect-square bg-[var(--marketing-sand)]">
        <PlanPhoto src={imageSrc} alt={alt} sizes="(max-width: 768px) 50vw, 25vw" />
        {plan.badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-[var(--marketing-ink)] px-2 py-1 text-[10px] font-semibold text-[var(--marketing-bg)]">
            {plan.badge}
          </span>
        ) : null}
        {off > 0 ? (
          <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[var(--marketing-ink)]">
            {off}% off
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--marketing-ink)]">{name}</h3>
        <ul className="space-y-1">
          {ticks.map((tick) => (
            <li key={tick.en} className="flex items-start gap-1 text-[11px] leading-snug text-[var(--marketing-muted)] sm:text-xs">
              <Check className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              <span>{lang === "hi" ? tick.hi : tick.en}</span>
            </li>
          ))}
        </ul>
        <p className="marketing-rupee text-sm font-semibold text-[var(--marketing-ink)]" data-price data-duration={selected.duration}>
          {formatRupees(selected.pricePaise)}
          {selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? (
            <span className="ml-1 text-xs font-normal text-[var(--marketing-muted)] line-through">
              {formatRupees(selected.mrpPaise)}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-1">
          {plan.prices.map((price) => {
            const chip = DURATION_CHIPS[price.duration];
            const label = lang === "hi" ? chip.hi : chip.en;
            const on = price.duration === selected.duration;
            return (
              <button
                key={price.duration}
                type="button"
                data-duration={price.duration}
                aria-pressed={on}
                onClick={() => setDuration(price.duration)}
                className={`min-h-11 rounded-full px-2.5 text-[11px] font-semibold ${on ? "bg-[var(--marketing-ink)] text-[var(--marketing-bg)]" : "border border-[var(--marketing-line)] text-[var(--marketing-ink)]"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <a href={buyHref(plan.slug, selected.duration)} className="marketing-cta mt-auto inline-flex justify-center text-center">
          {pick(lang, "Buy now", "अभी खरीदें")}
        </a>
        <Link href={`/plans/${plan.slug}?duration=${selected.duration}`} className="inline-flex min-h-11 items-center justify-center text-sm font-semibold underline">
          {pick(lang, "Details", "विवरण")}
        </Link>
      </div>
    </article>
  );
}

export function ProductGrid({ plans, hardware }: { plans: PublicPlan[]; hardware: StandAddon[] }) {
  const { lang } = useLandingLang();
  const [filter, setFilter] = React.useState<"all" | PlanCategory>("all");
  const [expanded, setExpanded] = React.useState(false);
  const [columns, setColumns] = React.useState(2);
  const visible = plans.filter((plan) => filter === "all" || planCategory(plan.category) === filter);
  const images = assignCardImages(
    visible.map((plan) => ({ imageUrl: plan.imageUrl, category: plan.category })),
    columns
  );
  const standImages = assignCardImages(
    hardware.map((item) => ({ imageUrl: item.imageUrl, category: "reviews" })),
    columns
  );

  React.useLayoutEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => setColumns(media.matches ? 4 : 2);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <section id="pricing" className="px-4 py-8 sm:py-14">
      <div className="mx-auto min-w-0 max-w-6xl">
        <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-[var(--marketing-ink)] sm:text-4xl">
          {pick(lang, "Choose your plan", "अपना प्लान चुनें")}
        </h2>
        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={filter === "all"}
            onClick={() => {
              setFilter("all");
              setExpanded(false);
            }}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${filter === "all" ? "bg-[var(--marketing-ink)] text-[var(--marketing-bg)]" : "border border-[var(--marketing-line)]"}`}
          >
            {pick(lang, "All", "सभी")}
          </button>
          {PLAN_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id);
                setExpanded(false);
              }}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${filter === item.id ? "bg-[var(--marketing-ink)] text-[var(--marketing-bg)]" : "border border-[var(--marketing-line)]"}`}
            >
              {lang === "hi" ? item.hi : item.en}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--marketing-muted)]">
            {pick(lang, "No plans in this category yet.", "इस श्रेणी में अभी कोई प्लान नहीं है।")}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {visible.map((plan, index) => (
              <ProductCard
                key={plan.slug}
                plan={plan}
                imageSrc={images[index]}
                className={index >= 6 && !expanded ? "max-lg:hidden" : ""}
              />
            ))}
          </div>
        )}
        {visible.length > 6 && !expanded ? (
          <button
            type="button"
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--marketing-line)] text-sm font-semibold lg:hidden"
            onClick={() => setExpanded(true)}
          >
            {pick(lang, "See all plans", "सभी प्लान देखें")}
          </button>
        ) : null}
        {hardware.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-lg font-semibold">{pick(lang, "Add a stand", "स्टैंड जोड़ें")}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {hardware.map((item, index) => (
                <article key={item.slug} data-card-image={standImages[index]} className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--marketing-line)] bg-white/80">
                  <div className="aspect-square bg-[var(--marketing-sand)]">
                    <PlanPhoto src={standImages[index]} alt={lang === "hi" ? item.nameHi : item.name} sizes="(max-width: 768px) 50vw, 25vw" />
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-sm font-semibold">{lang === "hi" ? item.nameHi : item.name}</p>
                    <p className="marketing-rupee text-sm font-semibold">
                      {formatRupees(item.salePaise)}
                      {item.mrpPaise ? (
                        <span className="ml-1 text-xs font-normal text-[var(--marketing-muted)] line-through">
                          {formatRupees(item.mrpPaise)}
                        </span>
                      ) : null}
                    </p>
                    <Link href="/dashboard/shop" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
                      {pick(lang, "Add a stand", "स्टैंड जोड़ें")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PlanDuration } from "@prisma/client";
import type { PublicPlan } from "@/lib/plans/public";
import { formatRupees } from "@/lib/landing/money";
import { assignCardImages, pictureNameFromSrc } from "@/lib/landing/card-images";
import { DURATION_CHIPS, PLAN_CATEGORIES, buyHref, planCategory, planTicks, type PlanCategory } from "@/lib/plans/categories";
import { LandingPicture } from "@/components/marketing/landing-v2/picture";

function cardInput(plan: PublicPlan) {
  const custom = plan.imageUrl.trim();
  const ours = custom === "" || custom.startsWith("/landing/");
  return { imageUrl: ours ? "" : custom, category: plan.category };
}

function PlanPhoto({ src, alt }: { src: string; alt: string }) {
  const name = pictureNameFromSrc(src);
  if (!name) {
    return <img src={src} alt={alt} width={800} height={600} />;
  }
  return <LandingPicture name={name} alt={alt} width={1600} height={1200} sizes="(max-width: 1023px) 45vw, 280px" />;
}

function PlanCard({ plan, imageSrc }: { plan: PublicPlan; imageSrc: string }) {
  const initial = (plan.prices.find((price) => price.duration === "MONTH_1") || plan.prices[0])?.duration;
  const [duration, setDuration] = React.useState<PlanDuration | undefined>(initial);
  const selected = plan.prices.find((price) => price.duration === duration) || plan.prices[0];
  if (!selected) return null;
  const ticks = planTicks(plan.category);
  return (
    <article className="hv3-card" data-plan-card={plan.slug} data-card-image={imageSrc}>
      <Link href={`/plans/${plan.slug}`} className="hv3-card-photo">
        <PlanPhoto src={imageSrc} alt={`${plan.nameEn} stand`} />
      </Link>
      <div className="hv3-card-body">
        <h3>{plan.nameEn}</h3>
        <ul className="hv3-checks">
          {ticks.map((tick) => (
            <li key={tick.en}>
              <Check size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{tick.en}</span>
            </li>
          ))}
        </ul>
        <p
          className="hv3-price marketing-rupee"
          data-price
          data-duration={selected.duration}
          {...(selected.pricePaise > 0 ? { "data-price-anchor": selected.pricePaise } : {})}
        >
          {formatRupees(selected.pricePaise)}
          {selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? <s>{formatRupees(selected.mrpPaise)}</s> : null}
        </p>
        <div className="hv3-chips" role="group" aria-label={`${plan.nameEn} duration`}>
          {plan.prices.map((price) => {
            const on = price.duration === selected.duration;
            return (
              <button
                key={price.duration}
                type="button"
                data-duration={price.duration}
                aria-pressed={on}
                onClick={() => setDuration(price.duration)}
              >
                {DURATION_CHIPS[price.duration].en}
              </button>
            );
          })}
        </div>
        <a className="hv3-btn hv3-btn-primary" href={buyHref(plan.slug, selected.duration)}>
          Buy now
        </a>
        <Link href={`/plans/${plan.slug}?duration=${selected.duration}`} className="hv3-btn hv3-btn-line">
          Details
        </Link>
      </div>
    </article>
  );
}

export function HomePlans({ plans }: { plans: PublicPlan[] }) {
  const [filter, setFilter] = React.useState<"all" | PlanCategory>("all");
  const [columns, setColumns] = React.useState(2);
  const visible = plans.filter((plan) => filter === "all" || planCategory(plan.category) === filter);
  const images = assignCardImages(visible.map(cardInput), columns);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => setColumns(media.matches ? 4 : 2);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return (
    <section id="pricing" className="hv3-section" aria-labelledby="home-plans-title">
      <div className="hv3-wrap">
        <h2 id="home-plans-title">Pick your plan</h2>
        <p className="hv3-lead hv3-muted" style={{ marginTop: 8 }}>
          Reviews, a menu, or WhatsApp orders. Hide the rest until you need them.
        </p>
        <div className="hv3-chips" style={{ marginTop: 16 }}>
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
            All
          </button>
          {PLAN_CATEGORIES.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.en}
            </button>
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="hv3-muted" style={{ marginTop: 16 }}>
            No plans in this category yet.
          </p>
        ) : (
          <div className="hv3-plans" style={{ marginTop: 16 }}>
            {visible.map((plan, index) => (
              <div key={plan.slug} className={index >= 4 ? "hv3-plan-extra" : undefined}>
                <PlanCard plan={plan} imageSrc={images[index]} />
              </div>
            ))}
          </div>
        )}
        {plans.length > 4 ? (
          <Link href="/pricing" className="hv3-btn hv3-btn-line hv3-btn-block" style={{ marginTop: 16 }}>
            See all plans
          </Link>
        ) : null}
      </div>
    </section>
  );
}

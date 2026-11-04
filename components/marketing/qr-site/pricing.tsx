"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlanDuration } from "@prisma/client";
import { Check, ChevronDown } from "lucide-react";
import type { PricingConfig } from "@/lib/settings";
import type { PublicPlan } from "@/lib/plans/public";
import type { PricingFaq } from "@/lib/plans/pricing-copy";
import { DURATION_LABELS } from "@/lib/plans/catalog";
import { buyHref, fallbackImageName } from "@/lib/plans/categories";
import { formatRupees } from "@/lib/landing/money";
import { formatINR } from "@/lib/utils";
import { isPlanFeatureAvailable } from "@/lib/plans/comparison";
import { Eyebrow, SectionHeading } from "./primitives";

function planImage(plan: PublicPlan) {
  const image = plan.imageUrl.trim();
  return image && !image.startsWith("data:") ? image : `/landing/${fallbackImageName(plan.category)}-800.webp`;
}

function PublicPlanCard({ plan }: { plan: PublicPlan }) {
  const initial = plan.prices.find((item) => item.duration === "YEAR_1") || plan.prices[0];
  const [duration, setDuration] = React.useState<PlanDuration | undefined>(initial?.duration);
  const selected = plan.prices.find((item) => item.duration === duration) || plan.prices[0];
  const image = planImage(plan);

  return (
    <article className="qr-plan-card">
      <Link className="qr-plan-image" href={`/plans/${plan.slug}`} aria-label={`View ${plan.nameEn} plan`}>
        <Image src={image} alt={`${plan.nameEn} plan`} width={800} height={600} sizes="(max-width: 760px) 80vw, (max-width: 1100px) 44vw, 320px" unoptimized />
        {plan.badge ? <span className="qr-plan-badge">{plan.badge}</span> : null}
      </Link>
      <div className="qr-plan-card-content">
        <div>
          <Eyebrow>{plan.category.replaceAll("-", " ")}</Eyebrow>
          <h3>{plan.nameEn}</h3>
          <p>{plan.descriptionEn}</p>
        </div>
        {selected ? (
          <div className="qr-price" data-price data-duration={selected.duration}>
            <strong>{formatRupees(selected.pricePaise)}</strong>
            {selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? <s>{formatRupees(selected.mrpPaise)}</s> : null}
            <span>/ {DURATION_LABELS[selected.duration].en}</span>
          </div>
        ) : <p className="qr-muted">Ask us about availability.</p>}
        {plan.prices.length ? (
          <div className="qr-choice-row" role="group" aria-label={`${plan.nameEn} duration`}>
            {plan.prices.map((item) => (
              <button key={item.duration} type="button" aria-pressed={item.duration === selected?.duration} onClick={() => setDuration(item.duration)}>
                {DURATION_LABELS[item.duration].en}
              </button>
            ))}
          </div>
        ) : null}
        <ul className="qr-plan-includes">
          {plan.bullets.filter((item) => isPlanFeatureAvailable(item.en, plan)).slice(0, 4).map((item) => (
            <li key={item.en}><Check size={16} aria-hidden="true" /><span>{item.en}</span></li>
          ))}
        </ul>
        <div className="qr-plan-actions">
          {selected ? <a className="qr-button qr-button-dark" href={buyHref(plan.slug, selected.duration)}>Buy now <span aria-hidden="true">↗</span></a> : null}
          <Link className="qr-button qr-button-light" href={`/plans/${plan.slug}${selected ? `?duration=${selected.duration}` : ""}`}>Plan details</Link>
        </div>
      </div>
    </article>
  );
}

function LegacyPlanCard({ plan, annual }: { plan: PricingConfig[keyof PricingConfig]; annual: boolean }) {
  const price = annual ? plan.yearly : plan.monthly;
  const tier = plan.tier;
  const href = tier === "FREE" ? "/register" : `/register?plan=${tier.toLowerCase()}`;
  return (
    <article className={`qr-plan-card qr-legacy-plan${plan.highlighted ? " is-highlighted" : ""}`}>
      {plan.highlighted ? <span className="qr-plan-badge">Most popular</span> : null}
      <div className="qr-plan-card-content">
        <div>
          <Eyebrow>{tier.toLowerCase()}</Eyebrow>
          <h3>{plan.name}</h3>
          <p>{plan.tagline}</p>
        </div>
        <div className="qr-price"><strong>{price === 0 ? "Free" : formatINR(price)}</strong><span>{price === 0 ? "forever" : annual ? "/ year" : "/ month"}</span></div>
        {annual && price > 0 ? <p className="qr-muted">≈ {formatINR(Math.round(price / 12))} / month</p> : null}
        <ul className="qr-plan-includes">
          {plan.features.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" /><span>{feature}</span></li>)}
        </ul>
        <div className="qr-plan-actions"><Link className="qr-button qr-button-dark" href={href}>{tier === "FREE" ? "Start free" : tier === "AGENCY" ? "Talk to sales" : "Start trial"} <span aria-hidden="true">↗</span></Link></div>
      </div>
    </article>
  );
}

export function PricingCards({
  plans,
  legacy,
  id = "pricing",
  title = "Plans that grow with your business",
  description = "Choose a plan for reviews, your digital menu, WhatsApp orders, or all three. Prices come from the active plan catalog."
}: {
  plans: PublicPlan[];
  legacy?: PricingConfig;
  id?: string;
  title?: string;
  description?: string;
}) {
  const [annual, setAnnual] = React.useState(true);
  const legacyPlans = legacy
    ? (["FREE", "STARTER", "GROWTH", "AGENCY"] as const).map((tier) => legacy[tier]).filter((plan) => plan.visible)
    : [];

  return (
    <section id={id} className="qr-section qr-pricing-section">
      <div className="qr-wrap">
        <SectionHeading number="07" eyebrow="The right plan" title={title} description={description} />
        {!plans.length ? (
          <div className="qr-pricing-toggle" role="group" aria-label="Billing interval">
            <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button>
            <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)}>Yearly</button>
          </div>
        ) : null}
        <div className="qr-plans-grid">
          {plans.length ? plans.map((plan) => <PublicPlanCard key={plan.slug} plan={plan} />) : legacyPlans.map((plan) => <LegacyPlanCard key={plan.tier} plan={plan} annual={annual} />)}
          {!plans.length && !legacyPlans.length ? <p className="qr-muted">Plans will be available soon.</p> : null}
        </div>
        <p className="qr-pricing-note">Checkout uses the saved plan price. INR payment and GST invoice details are shown during checkout.</p>
      </div>
    </section>
  );
}

export function FAQList({ faqs, title = "Questions owners ask" }: { faqs: PricingFaq[]; title?: string }) {
  return (
    <section className="qr-section qr-faq-section">
      <div className="qr-wrap qr-faq-wrap">
        <SectionHeading number="08" eyebrow="Good to know" title={title} />
        <div className="qr-faq-list">
          {faqs.map((faq) => (
            <details key={faq.qEn} className="qr-faq-item">
              <summary><span>{faq.qEn}</span><ChevronDown size={19} aria-hidden="true" /></summary>
              <p>{faq.aEn}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

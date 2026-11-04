"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlanDuration } from "@prisma/client";
import { Check, ChevronDown } from "lucide-react";
import type { PublicPlan } from "@/lib/plans/public";
import type { StandAddon } from "@/lib/landing/hardware";
import type { PricingFaq } from "@/lib/plans/pricing-copy";
import { MODULES, DURATION_LABELS } from "@/lib/plans/catalog";
import { buyHref, fallbackImageName, planAudience } from "@/lib/plans/categories";
import { isPlanFeatureAvailable, isPlanModuleUsable } from "@/lib/plans/comparison";
import { formatRupees } from "@/lib/landing/money";
import { Eyebrow, SectionHeading, TextLink } from "./primitives";
import type { SeoLocale } from "@/lib/seo";
import { LocalizedCopy, marketingText } from "./i18n";

const HARDWARE_FALLBACKS = ["product-reviews-800.webp", "product-menu-800.webp", "product-combo-800.webp", "product-store-800.webp"];

export function PlanDetail({
  plan,
  hardware,
  initialDuration,
  faqs,
  locale = "en"
}: {
  plan: PublicPlan;
  hardware: StandAddon[];
  initialDuration?: string;
  faqs: PricingFaq[];
  locale?: SeoLocale;
}) {
  const firstPrice = plan.prices.find((item) => item.duration === initialDuration) || plan.prices.find((item) => item.duration === "YEAR_1") || plan.prices[0];
  const [duration, setDuration] = React.useState<PlanDuration | undefined>(firstPrice?.duration);
  const selected = plan.prices.find((item) => item.duration === duration) || plan.prices[0];
  const image = plan.imageUrl.trim() && !plan.imageUrl.startsWith("data:")
    ? plan.imageUrl
    : `/landing/${fallbackImageName(plan.category)}-1600.webp`;
  const audience = planAudience(plan.category);
  const modules = plan.modules.map((id) => MODULES.find((item) => item.id === id)).filter((item): item is (typeof MODULES)[number] => item !== undefined && isPlanModuleUsable(item.id, plan));

  return (
    <LocalizedCopy locale={locale}><>
      <section className="qr-plan-detail-section">
        <div className="qr-wrap">
          <Link href={`${locale === "hi" ? "/hi" : ""}#pricing`} className="qr-back-link">← {marketingText("All plans", locale)}</Link>
          <div className="qr-plan-detail-grid">
            <div className="qr-plan-detail-image">
              <Image src={image} alt={`${locale === "hi" ? plan.nameHi : plan.nameEn} ${marketingText("Plan details", locale)}`} width={1200} height={1200} sizes="(max-width: 760px) 100vw, 50vw" unoptimized priority />
              <span>{marketingText("PL. 01", locale)}</span>
            </div>
            <div className="qr-plan-detail-copy">
              <Eyebrow>{marketingText(plan.badge || plan.category.replaceAll("-", " "), locale)}</Eyebrow>
              <h1>{locale === "hi" ? plan.nameHi : plan.nameEn}</h1>
              <p className="qr-plan-detail-description">{locale === "hi" ? plan.descriptionHi : plan.descriptionEn}</p>
              <p className="qr-audience-label">{marketingText("Who it is for", locale)}</p>
              <ul className="qr-audience-chips">{audience.map((item) => <li key={item.en}>{locale === "hi" ? item.hi : item.en}</li>)}</ul>
              {selected ? <p className="qr-detail-price" data-price data-duration={selected.duration}>{formatRupees(selected.pricePaise)} <span>{DURATION_LABELS[selected.duration][locale]}</span>{selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? <s>{formatRupees(selected.mrpPaise)}</s> : null}</p> : null}
              <div className="qr-choice-row qr-detail-durations" role="group" aria-label={`${plan.nameEn} plan duration`}>
                {plan.prices.map((price) => <button key={price.duration} type="button" aria-pressed={selected?.duration === price.duration} onClick={() => setDuration(price.duration)}>{DURATION_LABELS[price.duration][locale]}</button>)}
              </div>
              {selected ? <a href={buyHref(plan.slug, selected.duration)} className="qr-button qr-button-dark qr-detail-buy">{marketingText("Buy now", locale)} <span aria-hidden="true">↗</span></a> : null}
              <div className="qr-includes">
                <h2>What’s included</h2>
                <ul>
                  {plan.bullets.filter((bullet) => isPlanFeatureAvailable(bullet.en, plan)).map((bullet) => <li key={bullet.en}><Check size={17} aria-hidden="true" /><span>{locale === "hi" ? bullet.hi : bullet.en}</span></li>)}
                  {modules.map((module) => <li key={module.id}><Check size={17} aria-hidden="true" /><span>{locale === "hi" ? module.blurbHi : module.blurbEn}</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {hardware.length ? (
        <section className="qr-section qr-plan-addons">
          <div className="qr-wrap">
            <SectionHeading number="01" eyebrow="Optional hardware" title="Add a QR + NFC stand." description="A printed stand is optional. You can download the QR from your account if you already have a display." />
            <div className="qr-stands-grid">
              {hardware.slice(0, 4).map((item, index) => {
                const src = item.imageUrl || `/landing/${HARDWARE_FALLBACKS[index % HARDWARE_FALLBACKS.length]}`;
                return <article className="qr-stand-card" key={item.slug}>
                  <Link href="/dashboard/shop" className="qr-stand-image"><Image src={src} alt={`${locale === "hi" ? item.nameHi : item.name} product`} width={800} height={600} sizes="(max-width: 760px) 80vw, 290px" unoptimized /></Link>
                  <div className="qr-stand-info"><div><h3>{locale === "hi" ? item.nameHi : item.name}</h3><p>{item.needsNfc ? "QR + NFC" : locale === "hi" ? "QR स्टैंड" : "QR stand"}</p></div><strong>{formatRupees(item.salePaise)}</strong></div>
                  <Link className="qr-button qr-button-light" href="/dashboard/shop">{marketingText("View in shop", locale)} <span aria-hidden="true">↗</span></Link>
                </article>;
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="qr-plan-app-section">
        <div className="qr-wrap qr-plan-app-grid">
          <div><Eyebrow>QR24x7 ANDROID APP</Eyebrow><h2>Manage your page from your phone.</h2><p>Set up your page, update links, see activity and manage your plan in the app. Customer pages work in their phone browser.</p><TextLink href="/features">Explore all features</TextLink></div>
          <div className="qr-phone"><div className="qr-phone-screen"><Image src="/landing/app/plan.webp" alt="QR24x7 Android app showing plan details" width={540} height={1120} sizes="(max-width: 760px) 220px, 270px" /></div></div>
        </div>
      </section>

      <section className="qr-section qr-plan-faq">
        <div className="qr-wrap qr-faq-wrap">
          <div className="qr-section-heading"><Eyebrow>02 / PLAN QUESTIONS</Eyebrow><h2>A few useful details.</h2></div>
          <div className="qr-faq-list">{faqs.map((faq) => <details key={faq.qEn} className="qr-faq-item"><summary><span>{locale === "hi" ? faq.qHi : faq.qEn}</span><ChevronDown size={19} aria-hidden="true" /></summary><p>{locale === "hi" ? faq.aHi : faq.aEn}</p></details>)}</div>
        </div>
      </section>
      {selected ? <div className="qr-plan-sticky"><p>{formatRupees(selected.pricePaise)}<span> · {DURATION_LABELS[selected.duration][locale]}</span></p><a className="qr-button qr-button-dark" href={buyHref(plan.slug, selected.duration)}>{marketingText("Buy now", locale)} <span aria-hidden="true">↗</span></a></div> : null}
    </></LocalizedCopy>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PublicPlan } from "@/lib/plans/public";
import type { PricingFaq } from "@/lib/plans/pricing-copy";
import { DURATION_LABELS } from "@/lib/plans/catalog";
import { buyHref, fallbackImageName } from "@/lib/plans/categories";
import { formatRupees } from "@/lib/landing/money";
import { isPlanFeatureAvailable } from "@/lib/plans/comparison";
import { Eyebrow, SectionHeading } from "./primitives";
import { LocalizedCopy, marketingText } from "./i18n";
import type { SeoLocale } from "@/lib/seo";

export function HomePricing({ plans, faqs, locale }: { plans: PublicPlan[]; faqs: PricingFaq[]; locale: SeoLocale }) {
  return <LocalizedCopy locale={locale}>
    <>
      <section id="pricing" className="qr-section qr-pricing-section">
        <div className="qr-wrap">
          <SectionHeading
            number="07"
            eyebrow="The right plan"
            title={locale === "hi" ? "अपना प्लान चुनें" : "Pick your plan"}
            description={locale === "hi"
              ? "अपने कारोबार के लिए सक्रिय प्लान और अवधि चुनें। मौजूदा कीमतें प्लान सूची से दिखाई जाती हैं।"
              : "Choose the active plan and duration that suit your business. Every price comes from the current plan catalog."}
          />
          <div className="qr-plans-grid">
            {plans.length ? plans.map((plan) => {
              const selected = plan.prices.find((price) => price.duration === "YEAR_1") || plan.prices[0];
              const image = plan.imageUrl.trim() && !plan.imageUrl.startsWith("data:")
                ? plan.imageUrl
                : `/landing/${fallbackImageName(plan.category)}-800.webp`;
              const planPath = `${locale === "hi" ? "/hi" : ""}/plans/${plan.slug}`;
              return <article key={plan.slug} className="qr-plan-card">
                <Link className="qr-plan-image" href={planPath}>
                  <Image src={image} alt={`${locale === "hi" ? plan.nameHi : plan.nameEn} plan`} width={800} height={600} sizes="(max-width: 760px) 80vw, (max-width: 1100px) 44vw, 320px" unoptimized />
                  {plan.badge ? <span className="qr-plan-badge">{plan.badge}</span> : null}
                </Link>
                <div className="qr-plan-card-content">
                  <div>
                    <Eyebrow>{plan.category.replaceAll("-", " ")}</Eyebrow>
                    <h3>{locale === "hi" ? plan.nameHi : plan.nameEn}</h3>
                    <p>{locale === "hi" ? plan.descriptionHi : plan.descriptionEn}</p>
                  </div>
                  {selected ? <div className="qr-price" data-price data-duration={selected.duration}>
                    <strong>{formatRupees(selected.pricePaise)}</strong>
                    {selected.mrpPaise && selected.mrpPaise > selected.pricePaise ? <s>{formatRupees(selected.mrpPaise)}</s> : null}
                    <span>/ {DURATION_LABELS[selected.duration][locale]}</span>
                  </div> : <p className="qr-muted">{marketingText("Ask us about availability.", locale)}</p>}
                  {plan.prices.length > 1 ? <div className="qr-choice-row" aria-label={`${plan.nameEn} plan duration`}>
                    {plan.prices.map((price) => <Link
                      key={price.duration}
                      href={`${planPath}?duration=${price.duration}`}
                      aria-label={`${DURATION_LABELS[price.duration][locale]} ${locale === "hi" ? plan.nameHi : plan.nameEn}`}
                    >{DURATION_LABELS[price.duration][locale]}</Link>)}
                  </div> : null}
                  <ul className="qr-plan-includes">
                    {plan.bullets.filter((item) => isPlanFeatureAvailable(item.en, plan)).slice(0, 4).map((item) => (
                      <li key={item.en}><Check size={16} aria-hidden="true" /><span>{locale === "hi" ? item.hi : item.en}</span></li>
                    ))}
                  </ul>
                  <div className="qr-plan-actions">
                    {selected ? <a className="qr-button qr-button-dark" href={buyHref(plan.slug, selected.duration)}>{marketingText("Buy now", locale)} <span aria-hidden="true">↗</span></a> : null}
                    <Link className="qr-button qr-button-light" href={planPath}>{marketingText("Plan details", locale)}</Link>
                  </div>
                </div>
              </article>;
            }) : <p className="qr-muted">{locale === "hi" ? "प्लान जल्द उपलब्ध होंगे।" : "Plans will be available soon."}</p>}
          </div>
          <p className="qr-pricing-note">{locale === "hi"
            ? "चेकआउट में सेव की गई प्लान कीमत लागू होगी। INR भुगतान और GST बिल की जानकारी वहाँ दिखाई जाएगी।"
            : "Checkout uses the saved plan price. INR payment and GST invoice details are shown during checkout."}</p>
        </div>
      </section>
      <section className="qr-section qr-faq-section">
        <div className="qr-wrap qr-faq-wrap">
          <SectionHeading number="08" eyebrow="Good to know" title={marketingText("Questions owners ask", locale)} />
          <div className="qr-faq-list">
            {faqs.map((faq) => <details key={faq.qEn} className="qr-faq-item">
              <summary><span>{locale === "hi" ? faq.qHi : faq.qEn}</span><span aria-hidden="true">⌄</span></summary>
              <p>{locale === "hi" ? faq.aHi : faq.aEn}</p>
            </details>)}
          </div>
        </div>
      </section>
    </>
  </LocalizedCopy>;
}

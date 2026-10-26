"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { pick, useLandingLang } from "@/components/marketing/landing-v2/lang";
import type { PricingFaq } from "@/lib/plans/pricing-copy";

export function PricingFaqList({ faqs, className }: { faqs: PricingFaq[]; className?: string }) {
  const { lang } = useLandingLang();
  return (
    <Accordion type="single" collapsible className={className || "mx-auto mt-8 max-w-3xl space-y-2.5"}>
      {faqs.map((item, index) => (
        <AccordionItem
          key={`${item.qEn}-${index}`}
          value={`f${index}`}
          className="rounded-2xl border-0 bg-white/80 px-4 ring-1 ring-white sm:px-5"
        >
          <AccordionTrigger className="py-4 text-left text-sm font-semibold text-ink hover:no-underline sm:text-base">
            {pick(lang, item.qEn, item.qHi)}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-ink">
            {pick(lang, item.aEn, item.aHi)}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function PricingFaqBlock({ faqs }: { faqs: PricingFaq[] }) {
  const { lang } = useLandingLang();
  return (
    <section id="faq" className="py-16 sm:py-24">
      <div className="container max-w-3xl px-4">
        <h2 className="text-center font-display text-2xl font-bold sm:text-3xl">
          {pick(lang, "Questions owners ask us", "मालिक जो सवाल पूछते हैं")}
        </h2>
        <PricingFaqList faqs={faqs} />
      </div>
    </section>
  );
}

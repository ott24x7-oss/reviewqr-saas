"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import type { PlanDuration } from "@prisma/client";
import { DURATION_LABELS } from "@/lib/plans/catalog";
import { formatRupees } from "@/lib/landing/money";
import type { LandingTrust } from "@/lib/landing/proof";
import { LandingPicture } from "./picture";
import { pick, useLandingLang } from "./lang";

export type HeroAnchor = {
  paise: number;
  duration: PlanDuration;
  perMonth: boolean;
} | null;

function anchorLabel(anchor: HeroAnchor, lang: "en" | "hi") {
  if (!anchor) return null;
  const money = formatRupees(anchor.paise);
  if (anchor.perMonth) return pick(lang, `From ${money}/month`, `${money}/महीना से`);
  const duration = DURATION_LABELS[anchor.duration];
  const name = lang === "hi" ? duration.hi : duration.en;
  return pick(lang, `From ${money} (${name})`, `${money} से (${name})`);
}

export function SellHero({
  anchor,
  trust,
  whatsapp
}: {
  anchor: HeroAnchor;
  trust: LandingTrust;
  whatsapp: string | null;
}) {
  const { lang } = useLandingLang();
  const price = anchorLabel(anchor, lang);
  const alt = pick(
    lang,
    "Acrylic QR and NFC stand on an Indian café counter, with a phone scanning it",
    "भारतीय कैफ़े काउंटर पर एक्रिलिक QR और NFC स्टैंड, जिसे फ़ोन स्कैन कर रहा है"
  );

  const facts = [
    trust.rating != null && trust.reviewCount != null
      ? pick(lang, `${trust.rating} from ${trust.reviewCount} reviews`, `${trust.reviewCount} रिव्यू पर ${trust.rating}`)
      : null,
    trust.businesses != null
      ? pick(lang, `${trust.businesses} businesses`, `${trust.businesses} बिज़नेस`)
      : null,
    pick(lang, "No commission", "कोई कमीशन नहीं"),
    pick(lang, "Setup in 10 minutes", "10 मिनट में सेटअप"),
    pick(lang, "Made in India", "मेड इन इंडिया")
  ].filter((item): item is string => Boolean(item));

  return (
    <section id="sell-hero" className="marketing-band px-4 pb-6 pt-4 sm:pt-8">
      <div className="mx-auto grid max-w-6xl items-center gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <h1 className="max-w-xl text-balance font-display text-[1.75rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--marketing-ink)] sm:text-5xl lg:text-6xl">
            {pick(lang, "One stand for reviews and orders.", "रिव्यू और ऑर्डर, एक स्टैंड से।")}
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-[var(--marketing-muted)] sm:text-base">
            {pick(
              lang,
              "Google reviews, menu & WhatsApp orders from one QR + NFC stand",
              "Google रिव्यू, मेनू और WhatsApp ऑर्डर, एक QR + NFC स्टैंड से"
            )}
          </p>
          {price ? <p className="marketing-rupee mt-3 text-base font-semibold text-[var(--marketing-ink)]">{price}</p> : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a href="#pricing" className="marketing-cta inline-flex justify-center">
              {pick(lang, "Buy now", "अभी खरीदें")}
            </a>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--marketing-line)] px-4 text-sm font-semibold text-[var(--marketing-ink)]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                {pick(lang, "Talk to us", "बात करें")}
              </a>
            ) : null}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {facts.map((fact) => (
              <li
                key={fact}
                className="rounded-full border border-[var(--marketing-line)] bg-white/70 px-3 py-1 text-xs font-medium text-[var(--marketing-ink)]"
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <LandingPicture
          name="hero"
          alt={alt}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 1023px) 100vw, 46vw"
          className="aspect-[16/9] w-full rounded-[20px] object-cover"
        />
      </div>
    </section>
  );
}

export function StickyBuy({ anchor, whatsapp }: { anchor: HeroAnchor; whatsapp: string | null }) {
  const { lang } = useLandingLang();
  const [show, setShow] = React.useState(false);
  const price = anchorLabel(anchor, lang);

  React.useEffect(() => {
    const hero = document.getElementById("sell-hero");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-[var(--marketing-line)] bg-[var(--marketing-bg)] px-3 pt-2 md:hidden ${show ? "" : "pointer-events-none translate-y-full"}`}
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))", transition: "transform 180ms ease" }}
      data-sticky-buy={show ? "on" : "off"}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {price ? <p className="marketing-rupee min-w-0 flex-1 truncate text-sm font-semibold">{pick(lang, `Starting ${formatRupees(anchor!.paise)}`, `${formatRupees(anchor!.paise)} से`)}</p> : <span className="flex-1" />}
        <a href="#pricing" className="marketing-cta inline-flex justify-center" tabIndex={show ? 0 : -1}>
          {pick(lang, "Buy now", "अभी खरीदें")}
        </a>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            tabIndex={show ? 0 : -1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--marketing-line)]"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

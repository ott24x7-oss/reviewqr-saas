"use client";

import * as React from "react";
import Link from "next/link";
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
  whatsapp,
  freeHref
}: {
  anchor: HeroAnchor;
  trust: LandingTrust;
  whatsapp: string | null;
  freeHref?: string | null;
}) {
  const { lang } = useLandingLang();
  const price = anchorLabel(anchor, lang);
  const alt = pick(
    lang,
    "Acrylic QR and NFC stand on an Indian café counter, with a phone scanning it",
    "भारतीय कैफ़े काउंटर पर एक्रिलिक QR और NFC स्टैंड, जिसे फ़ोन स्कैन कर रहा है"
  );

  const trustLine = [
    trust.rating != null && trust.reviewCount != null
      ? pick(lang, `${trust.rating}★ (${trust.reviewCount})`, `${trust.rating}★ (${trust.reviewCount})`)
      : null,
    trust.businesses != null ? pick(lang, `${trust.businesses} shops`, `${trust.businesses} दुकान`) : null,
    pick(lang, "No commission", "कोई कमीशन नहीं"),
    pick(lang, "10 min setup", "10 मिनट सेटअप"),
    pick(lang, "Made in India", "मेड इन इंडिया")
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");

  return (
    <section id="sell-hero" className="scroll-mt-24 px-4 pb-5 pt-3 sm:pt-6">
      <div className="relative mx-auto min-w-0 max-w-6xl lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10">
        <LandingPicture
          name="hero"
          alt={alt}
          width={1600}
          height={900}
          priority
          sizes="(max-width: 1023px) 100vw, 46vw"
          className="aspect-[5/4] w-full rounded-[28px] object-cover shadow-[0_22px_50px_rgba(28,27,24,0.16)] sm:aspect-[16/10] lg:order-2 lg:aspect-[4/5]"
        />
        <div className="absolute inset-x-0 bottom-0 min-w-0 rounded-b-[28px] p-4 text-white lg:static lg:order-1 lg:rounded-none lg:p-0 lg:text-[var(--marketing-ink)]">
          <div className="pointer-events-none absolute inset-0 rounded-b-[28px] bg-gradient-to-t from-black/80 via-black/45 to-transparent lg:hidden" aria-hidden />
          <div className="relative min-w-0">
            <h1 className="max-w-xl text-balance font-display text-[1.65rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              {pick(lang, "One stand for reviews and orders.", "रिव्यू और ऑर्डर, एक स्टैंड से।")}
            </h1>
            <p className="mt-2 max-w-xl text-pretty text-sm leading-snug text-white/90 lg:text-[var(--marketing-muted)] sm:text-base">
              {pick(
                lang,
                "Google reviews, menu & WhatsApp orders from one QR + NFC stand",
                "Google रिव्यू, मेनू और WhatsApp ऑर्डर, एक QR + NFC स्टैंड से"
              )}
            </p>
            <div className="mt-2 flex items-center justify-between gap-3">
              {price ? (
                <p className="marketing-rupee text-base font-semibold" data-price-anchor={anchor!.paise}>
                  {price}
                </p>
              ) : (
                <span />
              )}
              {freeHref ? (
                <Link href={freeHref} className="shrink-0 text-sm font-semibold underline">
                  {pick(lang, "Start free", "मुफ़्त शुरू करें")}
                </Link>
              ) : null}
            </div>
            <div className={`mt-3 grid gap-2 ${whatsapp ? "grid-cols-2" : "grid-cols-1"}`}>
              <a href="#pricing" className="marketing-cta inline-flex justify-center px-3">
                {pick(lang, "Buy now", "अभी खरीदें")}
              </a>
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/55 bg-white/15 px-3 text-sm font-semibold text-white lg:border-[var(--marketing-line)] lg:bg-transparent lg:text-[var(--marketing-ink)]"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  WhatsApp
                </a>
              ) : null}
            </div>
            <Link href="/how-it-works" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline">
              {pick(lang, "How it works", "कैसे काम करता है")}
            </Link>
            <p className="mt-1 truncate text-[10px] font-medium leading-4 text-white/90 sm:text-xs lg:text-[var(--marketing-muted)]">
              {trustLine}
            </p>
          </div>
        </div>
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
        {price ? (
          <p className="marketing-rupee min-w-0 flex-1 truncate text-sm font-semibold">{price}</p>
        ) : (
          <span className="flex-1" />
        )}
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

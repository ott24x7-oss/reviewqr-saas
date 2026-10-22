"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, Star } from "lucide-react";
import { pick, useLandingLang } from "@/components/marketing/landing-v2/lang";
import { DEFAULT_BRAND_NAME } from "@/lib/brand-defaults";

const primary = [
  { href: "/features", en: "Features", hi: "फ़ीचर" },
  { href: "/how-it-works", en: "How it works", hi: "कैसे काम करता है" },
  { href: "/#pricing", en: "Plans", hi: "प्लान" }
];

const more = [
  { href: "/features#features", en: "All features", hi: "सभी फ़ीचर" },
  { href: "/features#store", en: "WhatsApp store", hi: "WhatsApp स्टोर" },
  { href: "/features#products", en: "QR + NFC", hi: "QR + NFC" },
  { href: "/#faq", en: "FAQ", hi: "सवाल" },
  { href: "/features#how", en: "How it works on this page", hi: "इस पेज पर कदम" },
  { href: "/demo", en: "Live demo", hi: "लाइव डेमो" }
];

export function MarketingNavbar({
  brand
}: {
  brand?: { name: string; logoUrl: string };
}) {
  const name = brand?.name || DEFAULT_BRAND_NAME;
  const logoUrl = brand?.logoUrl || "";
  const [open, setOpen] = React.useState(false);
  const { lang, setLang } = useLandingLang();

  return (
    <header className="sticky top-2 z-50 px-3 sm:top-4 sm:px-4">
      <div className="mx-auto max-w-5xl">
        <div className="marketing-nav px-3 sm:px-4">
          <div className="relative flex h-12 items-center justify-between gap-2 sm:h-16">
            <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="h-8 w-8 rounded-xl object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--marketing-ink)] text-[var(--marketing-bg)]">
                  <Star className="h-4 w-4 fill-current" aria-hidden />
                </span>
              )}
              <span className="truncate font-display text-base text-[var(--marketing-ink)] sm:text-lg">{name}</span>
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="Primary">
              {primary.map((item) => (
                <a key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium">
                  {lang === "hi" ? item.hi : item.en}
                </a>
              ))}
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium">
                  {pick(lang, "More", "और")}
                </summary>
                <div className="absolute left-0 top-full z-10 mt-2 w-56 rounded-2xl border border-[var(--marketing-line)] bg-[var(--marketing-bg)] p-2 shadow-lg">
                  {more.map((item) => (
                    <a key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm">
                      {lang === "hi" ? item.hi : item.en}
                    </a>
                  ))}
                </div>
              </details>
            </nav>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-full px-2 text-xs font-semibold"
                onClick={() => setLang(lang === "hi" ? "en" : "hi")}
                aria-label={lang === "hi" ? "English" : "हिन्दी"}
              >
                {lang === "hi" ? "EN" : "हिन्दी"}
              </button>
              <Link href="/login" className="hidden min-h-11 items-center px-2 text-sm font-medium sm:inline-flex">
                {pick(lang, "Login", "लॉगिन")}
              </Link>
              <a href="/#pricing" className="marketing-cta inline-flex justify-center px-3">
                {pick(lang, "Buy now", "अभी खरीदें")}
              </a>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl md:hidden"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                aria-label={open ? "Close menu" : "Open menu"}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {open ? (
          <div className="marketing-sheet mt-2 p-3 md:hidden">
            <div className="flex flex-col">
              {primary.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base font-medium">
                  {lang === "hi" ? item.hi : item.en}
                </a>
              ))}
              <p className="px-3 pt-2 text-xs font-semibold text-[var(--marketing-muted)]">{pick(lang, "More", "और")}</p>
              {more.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base">
                  {lang === "hi" ? item.hi : item.en}
                </a>
              ))}
            </div>
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-11 items-center px-3 text-sm font-semibold">
              {pick(lang, "Login", "लॉगिन")}
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { Brand } from "@/lib/brand";
import type { SeoLocale } from "@/lib/seo";

const HEADER_COPY: Record<string, string> = {
  "Features": "सुविधाएँ",
  "How it works": "कैसे काम करता है",
  "Pricing": "कीमतें",
  "Shop stands": "स्टैंड खरीदें",
  "For your business": "आपके कारोबार के लिए",
  "Login": "लॉग इन",
  "Start free": "मुफ़्त शुरू करें",
  "Open navigation": "नेविगेशन खोलें",
  "Close navigation": "नेविगेशन बंद करें"
};

function headerText(value: string, locale: SeoLocale) {
  return locale === "hi" ? HEADER_COPY[value] || value : value;
}

const links = [
  { href: "/features", homeHref: "#features", label: "Features" },
  { href: "/how-it-works", homeHref: "#how", label: "How it works" },
  { href: "/pricing", homeHref: "#pricing", label: "Pricing" },
  { href: "/dashboard/shop", homeHref: "#shop", label: "Shop stands" }
];

const industryLinks = [
  ["restaurants", "Restaurants", "रेस्तराँ"], ["cafes", "Cafes", "कैफ़े"], ["bakeries", "Bakeries", "बेकरी"],
  ["salons", "Salons", "सैलून"], ["clinics", "Clinics", "क्लिनिक"], ["kirana-stores", "Kirana stores", "किराना दुकानें"],
  ["hotels", "Hotels", "होटल"], ["gyms", "Gyms", "जिम"]
] as const;

export function SiteHeader({ brand, startHref, locale = "en", path = "/", isHome = false }: { brand: Brand; startHref: string; locale?: SeoLocale; path?: string; isHome?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const homeHref = locale === "hi" ? "/hi" : "/";
  const localeHref = locale === "hi" ? (path || "/").replace(/^\/hi(?=\/|$)/, "") || "/" : `/hi${path === "/" ? "" : path}`;
  const switchLabel = locale === "hi" ? "English" : "हिंदी";

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className={`qr-header${isHome ? " qr-header-home" : ""}`}>
      <div className="qr-header-inner">
          <Link href={homeHref} className="qr-brand" onClick={() => setOpen(false)}>
          <Image src="/brand/logo-mark.png" width={34} height={34} alt="" />
          <span>{brand.name}</span>
        </Link>
        <nav className="qr-nav" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={isHome ? link.homeHref : link.href.startsWith("/dashboard") ? link.href : locale === "hi" ? `/hi${link.href}` : link.href}>{headerText(link.label, locale)}</Link>)}
          <details className="qr-nav-menu"><summary>{headerText("For your business", locale)}</summary><div>{industryLinks.map(([slug, en, hi]) => <Link key={slug} href={`${locale === "hi" ? "/hi" : ""}/for/${slug}`}>{locale === "hi" ? hi : en}</Link>)}</div></details>
        </nav>
        <div className="qr-header-actions">
          <Link className="qr-login" href="/login">{headerText("Login", locale)}</Link>
          <Link className="qr-language-switch" href={localeHref} hrefLang={locale === "hi" ? "en-IN" : "hi-IN"} lang={locale === "hi" ? "en" : "hi"}>{switchLabel}</Link>
          <Link className="qr-button qr-button-dark qr-header-cta" href={startHref}>{headerText("Start free", locale)} <span aria-hidden="true">↗</span></Link>
          <button
            className="qr-menu-toggle"
            type="button"
            aria-label={headerText(open ? "Close navigation" : "Open navigation", locale)}
            aria-expanded={open}
            aria-controls="qr-mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav id="qr-mobile-nav" className="qr-mobile-nav" aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={isHome ? link.homeHref : link.href.startsWith("/dashboard") ? link.href : locale === "hi" ? `/hi${link.href}` : link.href} onClick={() => setOpen(false)}>{headerText(link.label, locale)}</Link>)}
          <strong>{headerText("For your business", locale)}</strong>
          {industryLinks.map(([slug, en, hi]) => <Link key={slug} href={`${locale === "hi" ? "/hi" : ""}/for/${slug}`} onClick={() => setOpen(false)}>{locale === "hi" ? hi : en}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)}>{headerText("Login", locale)}</Link>
          <Link href={localeHref} onClick={() => setOpen(false)} lang={locale === "hi" ? "en" : "hi"}>{switchLabel}</Link>
          <Link className="qr-button qr-button-dark" href={startHref} onClick={() => setOpen(false)}>{headerText("Start free", locale)} <span aria-hidden="true">↗</span></Link>
        </nav>
      ) : null}
    </header>
  );
}

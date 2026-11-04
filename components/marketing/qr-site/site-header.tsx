"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { Brand } from "@/lib/brand";
import type { SeoLocale } from "@/lib/seo";
import { marketingText } from "./i18n";

const links = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard/shop", label: "Shop / Stands" }
];

export function SiteHeader({ brand, startHref, locale = "en", path = "/" }: { brand: Brand; startHref: string; locale?: SeoLocale; path?: string }) {
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
    <header className="qr-header">
      <div className="qr-header-inner">
        <Link href={homeHref} className="qr-brand" aria-label={`${brand.name} home`} onClick={() => setOpen(false)}>
          <Image src="/brand/logo-mark.png" width={34} height={34} alt="" priority />
          <span>{brand.name}</span>
        </Link>
        <nav className="qr-nav" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href.startsWith("/dashboard") ? link.href : locale === "hi" ? `/hi${link.href}` : link.href}>{marketingText(link.label, locale)}</Link>)}
        </nav>
        <div className="qr-header-actions">
          <Link className="qr-login" href="/login">{marketingText("Login", locale)}</Link>
          <Link className="qr-language-switch" href={localeHref} hrefLang={locale === "hi" ? "en-IN" : "hi-IN"} lang={locale === "hi" ? "en" : "hi"}>{switchLabel}</Link>
          <Link className="qr-button qr-button-dark qr-header-cta" href={startHref}>{marketingText("Start free", locale)} <span aria-hidden="true">↗</span></Link>
          <button
            className="qr-menu-toggle"
            type="button"
            aria-label={marketingText(open ? "Close navigation" : "Open navigation", locale)}
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
          {links.map((link) => <Link key={link.href} href={link.href.startsWith("/dashboard") ? link.href : locale === "hi" ? `/hi${link.href}` : link.href} onClick={() => setOpen(false)}>{marketingText(link.label, locale)}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)}>{marketingText("Login", locale)}</Link>
          <Link href={localeHref} onClick={() => setOpen(false)} lang={locale === "hi" ? "en" : "hi"}>{switchLabel}</Link>
          <Link className="qr-button qr-button-dark" href={startHref} onClick={() => setOpen(false)}>{marketingText("Start free", locale)} <span aria-hidden="true">↗</span></Link>
        </nav>
      ) : null}
    </header>
  );
}

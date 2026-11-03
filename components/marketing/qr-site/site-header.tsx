"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { Brand } from "@/lib/brand";

const links = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/dashboard/shop", label: "Shop / Stands" }
];

export function SiteHeader({ brand, startHref }: { brand: Brand; startHref: string }) {
  const [open, setOpen] = React.useState(false);

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
        <Link href="/" className="qr-brand" aria-label={`${brand.name} home`} onClick={() => setOpen(false)}>
          <Image src="/brand/logo-mark.png" width={34} height={34} alt="" priority />
          <span>{brand.name}</span>
        </Link>
        <nav className="qr-nav" aria-label="Main navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="qr-header-actions">
          <Link className="qr-login" href="/login">Login</Link>
          <Link className="qr-button qr-button-dark qr-header-cta" href={startHref}>Start free <span aria-hidden="true">↗</span></Link>
          <button
            className="qr-menu-toggle"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
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
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
          <Link href="/login" onClick={() => setOpen(false)}>Login</Link>
          <Link className="qr-button qr-button-dark" href={startHref} onClick={() => setOpen(false)}>Start free <span aria-hidden="true">↗</span></Link>
        </nav>
      ) : null}
    </header>
  );
}

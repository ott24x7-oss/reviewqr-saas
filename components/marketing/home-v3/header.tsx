"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { DEMO_TAP_HREF } from "./links";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: DEMO_TAP_HREF, label: "Live demo" }
];

export function HomeHeader({ name, startHref }: { name: string; startHref: string }) {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="hv3-header" data-scrolled={scrolled ? "true" : "false"}>
      <a className="hv3-skip" href="#home-main">
        Skip to content
      </a>
      <div className="hv3-header-inner">
        <Link href="/" className="hv3-brand">
          <img src="/brand/icon-192.png" alt={`${name} mark`} width={24} height={24} />
          <span>{name}</span>
        </Link>
        <div className="hv3-header-actions">
          <Link href="/login" className="hv3-login">
            Login
          </Link>
          <Link href={startHref} className="hv3-btn hv3-btn-primary">
            Get started
          </Link>
          <button
            type="button"
            className="hv3-icon-btn"
            aria-expanded={open}
            aria-controls="home-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={20} strokeWidth={1.75} /> : <Menu size={20} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="hv3-sheet-back" onClick={() => setOpen(false)}>
          <nav
            id="home-menu"
            className="hv3-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(event) => event.stopPropagation()}
          >
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)}>
              Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

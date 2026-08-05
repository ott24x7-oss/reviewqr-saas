"use client";
import * as React from "react";
import Link from "next/link";
import { Menu, X, Star, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/demo", label: "Demo" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" }
];

export function MarketingNavbar({
  brand
}: {
  brand?: { name: string; logoUrl: string };
}) {
  const name = brand?.name || "ReviewQR";
  const logoUrl = brand?.logoUrl || "";
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-3 sm:top-4 z-50 px-3 sm:px-4">
      <div className="mx-auto max-w-5xl">
        {/* Floating glass pill */}
        <div className="glass-strong rounded-2xl border border-white/60 shadow-[0_14px_40px_-16px_rgba(30,41,59,0.4)] px-3 sm:px-4">
          <div className="relative flex h-14 sm:h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={name} className="h-9 w-9 rounded-xl object-cover shadow-sm" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-grad-brand shadow-glow">
                  <Star className="h-5 w-5 fill-white text-white" />
                </span>
              )}
              <span className="font-display text-ink">{name}</span>
            </Link>

            {/* Center nav */}
            <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-muted-ink hover:text-ink hover:bg-white/50 transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-ink hover:bg-white/50 transition-colors"
              >
                Login
              </Link>
              <Button variant="skeuo" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/register">
                  <Sparkles className="h-4 w-4" /> Start Free
                </Link>
              </Button>

              {/* Mobile toggle */}
              <button
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl skeuo text-ink"
                onClick={() => setOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden mt-2 glass-strong rounded-2xl border border-white/60 shadow-xl p-3">
            <div className="flex flex-col">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-3 rounded-xl text-base font-medium text-ink hover:bg-white/60"
                >
                  {l.label}
                </a>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/50">
              <Button variant="neu" asChild>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Login
                </Link>
              </Button>
              <Button variant="skeuo" asChild>
                <Link href="/register" onClick={() => setOpen(false)}>
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

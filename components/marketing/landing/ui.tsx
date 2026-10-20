import * as React from "react";
import { cn } from "@/lib/utils";
import { LIVE, type Module } from "./features-status";

export function SectionShell({
  id,
  className,
  children
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-[1.75rem] sm:rounded-[2rem] neu overflow-hidden", className)}>
      <div className="px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-800">
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center"
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-3 text-[1.75rem] leading-tight sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-ink text-balance">
        {title}
      </h2>
      {sub && <p className="mt-3 text-base sm:text-lg text-muted-ink text-pretty">{sub}</p>}
    </div>
  );
}

export function SoonBadge({ module, className }: { module: Module; className?: string }) {
  if (LIVE[module]) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800",
        className
      )}
    >
      Coming soon
    </span>
  );
}

/** Simple phone frame used by every product mockup. */
export function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[260px] sm:w-[280px] rounded-[2.4rem] bg-slate-900 p-2.5 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.45)]",
        className
      )}
    >
      <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-slate-900" aria-hidden />
      <div className="relative h-[520px] overflow-hidden rounded-[1.9rem] bg-white">{children}</div>
    </div>
  );
}

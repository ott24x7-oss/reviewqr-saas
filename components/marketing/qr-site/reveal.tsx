import type { ReactNode } from "react";

/** Marketing copy stays visible in server HTML without adding an animation runtime. */
export function Reveal({ children, className }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={className}>{children}</div>;
}

/** Decorative wordmark: the home page's semantic heading is its keyword line. */
export function HeroWordReveal({ text }: { text: string }) {
  return <div className="qr-hero-wordmark" aria-hidden="true">{text}</div>;
}

"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Keeps server-rendered copy visible, then adds a small scroll rise after hydration. */
export function Reveal({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion() === true;
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  if (!ready || reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 1, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.58, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function HeroWordReveal({ text }: { text: string }) {
  const reduce = useReducedMotion() === true;
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);

  if (!ready || reduce) return <h1 className="qr-hero-wordmark">{text}</h1>;

  return (
    <h1 className="qr-hero-wordmark" aria-label={text}>
      {Array.from(text).map((letter, index) => (
        <span key={`${letter}-${index}`} aria-hidden="true" style={{ animationDelay: `${index * 24}ms` }}>
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
    </h1>
  );
}

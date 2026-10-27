"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade and rise when the block enters the viewport. Reduced motion stays still. */
export function Reveal({
  children,
  className,
  y = 16,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion() === true;
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => setReady(true), []);
  // Stay visible in the server HTML. The fade starts only after hydration.
  if (!ready || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.52, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A small rise and tilt as the phone moves through the viewport. */
export function PhoneTilt({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion() === true;
  const [ready, setReady] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [16, -16]);
  const tilt = useTransform(scrollYProgress, [0, 1], [5, -5]);
  React.useEffect(() => setReady(true), []);
  if (!ready || reduce) return <div ref={ref}>{children}</div>;
  return (
    <motion.div ref={ref} style={{ y, rotateX: tilt, transformPerspective: 800 }}>
      {children}
    </motion.div>
  );
}

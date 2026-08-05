"use client";
import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Animated headline word that cycles between the review platforms ReviewQR
 * supports. "Google reviews" (Google multicolor) ↔ "Trustpilot reviews"
 * (Trustpilot green). Respects prefers-reduced-motion.
 */
const WORDS = [
  { label: "Google reviews", cls: "gradient-text-google" },
  { label: "Trustpilot reviews", cls: "text-[#00b67a]" }
];

export function RotatingReviewWord() {
  const [i, setI] = React.useState(0);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2600);
    return () => clearInterval(t);
  }, [reduced]);

  if (reduced) {
    return <span className={WORDS[0].cls}>{WORDS[0].label}</span>;
  }

  return (
    <span className="relative inline-flex overflow-hidden align-bottom pb-[0.12em]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          initial={{ y: "0.55em", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-0.55em", opacity: 0 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className={cn("inline-block whitespace-nowrap", WORDS[i].cls)}
        >
          {WORDS[i].label}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

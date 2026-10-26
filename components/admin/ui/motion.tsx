"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

export function useMotionSafe() {
  return useReducedMotion() === true;
}

export function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useMotionSafe();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      // Keep server-rendered admin pages visible before client hydration. An
      // opacity-zero initial state leaves the whole screen blank if hydration
      // is delayed or a browser blocks the motion bundle.
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useMotionSafe();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.02 } } }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.15 }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

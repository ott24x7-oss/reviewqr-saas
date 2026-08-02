"use client";

import { useEffect, useState } from "react";

/**
 * Whether heavy visual effects (canvas ripples, Lenis smooth scroll, gsap
 * scroll animations) should run. Enabled only on larger screens with a fine
 * pointer and when the user hasn't asked for reduced motion. Touch devices fall
 * back to native scrolling and static visuals.
 */
export function isHeavyFx(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  const bigFinePointer = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return bigFinePointer && !reduced;
}

/** React hook version — for components that conditionally render heavy FX. */
export function useHeavyFx(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mqPointer = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(mqPointer.matches && !mqMotion.matches);
    update();
    mqPointer.addEventListener("change", update);
    mqMotion.addEventListener("change", update);
    return () => {
      mqPointer.removeEventListener("change", update);
      mqMotion.removeEventListener("change", update);
    };
  }, []);
  return enabled;
}

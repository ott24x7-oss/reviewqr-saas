import { ScrollTrigger } from "gsap/ScrollTrigger";
import { onLenis } from "./lenis-store";

/**
 * Bridge GSAP ScrollTrigger to the global Lenis instance so scroll-scrubbed
 * animations update in the same frame as the smooth scroll (no lag/jitter).
 * Idempotent — safe to call from every component that uses ScrollTrigger.
 */
let wired = false;
export function ensureGsapLenisBridge() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  onLenis((lenis) => {
    if (lenis) lenis.on("scroll", () => ScrollTrigger.update());
  });
}

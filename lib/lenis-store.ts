import type Lenis from "lenis";

/**
 * Tiny client-side store for the single global Lenis instance created by
 * <SmoothScroll />. Lets scroll-driven components subscribe and run their
 * updates in Lenis's own frame.
 */
let current: Lenis | null = null;
const subscribers = new Set<(l: Lenis | null) => void>();

export function setLenis(instance: Lenis | null) {
  current = instance;
  subscribers.forEach((cb) => cb(instance));
}

export function getLenis(): Lenis | null {
  return current;
}

/** Subscribe to the current (and future) Lenis instance. Fires immediately. */
export function onLenis(cb: (l: Lenis | null) => void): () => void {
  subscribers.add(cb);
  cb(current);
  return () => subscribers.delete(cb);
}

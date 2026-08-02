"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { setLenis } from "@/lib/lenis-store";
import { isHeavyFx } from "@/lib/fx";

/**
 * Global smooth scrolling (Lenis) for a fluid, designer-site feel (ported from
 * WatShop). Desktop + fine-pointer only; falls back to native scroll on touch
 * and under prefers-reduced-motion. Also smooths in-page anchor navigation
 * (#section / /#section) with the correct offset under the fixed header.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!isHeavyFx()) return;

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5
    });

    setLenis(lenis);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const hashIndex = href.indexOf("#");
      if (hashIndex < 0) return;
      const path = href.slice(0, hashIndex);
      const hash = href.slice(hashIndex);
      const samePage = path === "" || path === "/" || path === window.location.pathname;
      if (!samePage || hash.length < 2) return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -84 });
      history.replaceState(null, "", hash);
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick);
      setLenis(null);
      lenis.destroy();
    };
  }, []);

  return null;
}

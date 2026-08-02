"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ensureGsapLenisBridge } from "@/lib/gsap-lenis";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollFloat (gsap, ported from WatShop) — reveals a heading character-by-
 * character as it enters view. SSR-safe: renders plain text on the server; the
 * character split happens after mount. Disabled under prefers-reduced-motion.
 */
type Props = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  containerClassName?: string;
  textClassName?: string;
  animationDuration?: number;
  ease?: string;
  scrollStart?: string;
  stagger?: number;
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function ScrollFloat({
  children,
  as: Tag = "h2",
  containerClassName = "",
  textClassName = "",
  animationDuration = 0.8,
  ease = "back.out(1.6)",
  scrollStart = "top 88%",
  stagger = 0.025
}: Props) {
  const ref = useRef<HTMLHeadingElement>(null);
  const text = typeof children === "string" ? children : "";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(".scroll-float-text");
    if (!target) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    target.innerHTML = text
      .split("")
      .map((c) => `<span class="char">${c === " " ? "&nbsp;" : escapeHtml(c)}</span>`)
      .join("");

    ensureGsapLenisBridge();
    const charEls = target.querySelectorAll(".char");
    const tween = gsap.fromTo(
      charEls,
      { opacity: 0, yPercent: 120, scaleY: 2.3, scaleX: 0.7, transformOrigin: "50% 0%" },
      {
        duration: animationDuration,
        ease,
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        stagger,
        scrollTrigger: { trigger: el, scroller: window, start: scrollStart, toggleActions: "play none none none" }
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      target.textContent = text;
    };
  }, [text, animationDuration, ease, scrollStart, stagger]);

  return (
    <Tag ref={ref} className={`scroll-float ${containerClassName}`.trim()}>
      <span className={`scroll-float-text ${textClassName}`.trim()}>{text}</span>
    </Tag>
  );
}

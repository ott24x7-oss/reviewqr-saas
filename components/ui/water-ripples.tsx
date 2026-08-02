"use client";

import { useEffect, useRef } from "react";
import { isHeavyFx } from "@/lib/fx";

/**
 * Interactive water-ripple background layer (ported from WatShop).
 *
 * Concentric ripples spawn where the cursor moves and while the page scrolls,
 * expanding and fading like ripples on water. Pure <canvas> — no libraries, no
 * images. Reads the theme CSS variables so it recolors with the theme, and
 * fully disables under prefers-reduced-motion / on touch devices.
 *
 * Rendered inside BackgroundFX (fixed, behind content, pointer-events: none).
 */
type Ripple = { x: number; y: number; age: number; life: number; maxR: number; rgb: string };

export function WaterRipples() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isHeavyFx()) return;

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const cv: HTMLCanvasElement = canvasEl;
    const g: CanvasRenderingContext2D = context;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ripples: Ripple[] = [];
    const MAX = 56;

    let palette: string[] = ["139,92,246", "34,211,238"];
    let additive = true;
    function readTheme() {
      const cs = getComputedStyle(document.documentElement);
      const toRgb = (v: string) => cs.getPropertyValue(v).trim().split(/\s+/).slice(0, 3).join(",");
      const primary = toRgb("--c-primary");
      const tertiary = toRgb("--c-tertiary") || primary;
      const accent = toRgb("--c-accent") || primary;
      if (primary) palette = [primary, tertiary, accent].filter(Boolean);
      const bg = toRgb("--c-bg").split(",").map(Number);
      if (bg.length === 3) {
        const lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
        additive = lum < 0.5;
      }
    }
    readTheme();
    const themeObserver = new MutationObserver(readTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      cv.width = Math.floor(width * dpr);
      cv.height = Math.floor(height * dpr);
      cv.style.width = width + "px";
      cv.style.height = height + "px";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    let colorTick = 0;
    function spawn(x: number, y: number, strength = 1) {
      if (ripples.length >= MAX) ripples.shift();
      const rgb = palette[colorTick++ % palette.length];
      ripples.push({
        x,
        y,
        age: 0,
        life: 70 + Math.random() * 40,
        maxR: (120 + Math.random() * 120) * strength,
        rgb
      });
      ensureLoop();
    }

    let lastX = width / 2;
    let lastY = height / 2;
    let lastMoveT = 0;
    let px = -1;
    let py = -1;
    function onPointer(e: PointerEvent) {
      lastX = e.clientX;
      lastY = e.clientY;
      const now = performance.now();
      const dist = Math.hypot(e.clientX - px, e.clientY - py);
      if (now - lastMoveT > 42 && dist > 16) {
        spawn(e.clientX, e.clientY, 0.7);
        lastMoveT = now;
        px = e.clientX;
        py = e.clientY;
      }
    }

    let lastScrollT = 0;
    function onScroll() {
      const now = performance.now();
      if (now - lastScrollT < 110) return;
      lastScrollT = now;
      spawn(lastX + (Math.random() - 0.5) * 80, Math.random() * height, 1);
    }

    let raf = 0;
    let running = true;
    let looping = false;
    function ensureLoop() {
      if (!looping && running) {
        looping = true;
        raf = requestAnimationFrame(frame);
      }
    }
    function frame() {
      if (!running) {
        looping = false;
        return;
      }
      g.clearRect(0, 0, width, height);
      g.globalCompositeOperation = additive ? "lighter" : "source-over";

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.age += 1;
        const p = r.age / r.life;
        if (p >= 1) {
          ripples.splice(i, 1);
          continue;
        }
        const eased = 1 - Math.pow(1 - p, 3);
        const radius = eased * r.maxR;
        const fade = Math.sin(p * Math.PI);
        for (let k = 0; k < 3; k++) {
          const rr = radius - k * 9;
          if (rr <= 0) continue;
          const a = fade * (0.16 - k * 0.045);
          if (a <= 0.002) continue;
          g.beginPath();
          g.arc(r.x, r.y, rr, 0, Math.PI * 2);
          g.strokeStyle = `rgba(${r.rgb},${a.toFixed(3)})`;
          g.lineWidth = 1.4;
          g.stroke();
        }
      }
      if (ripples.length > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        looping = false;
        g.clearRect(0, 0, width, height);
      }
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
        looping = false;
      } else if (!running) {
        running = true;
        ensureLoop();
      }
    }

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      themeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * ShapeGrid (React Bits style) — an animated grid of outlined shapes that
 * slowly drifts in a direction; the shape under the cursor fills in and leaves
 * a fading trail. Pure <canvas>, no dependencies. Meant as a fixed/absolute
 * background layer (pointer-events handled here). Disabled under
 * prefers-reduced-motion (renders a static grid).
 */
type Shape = "square" | "hexagon" | "circle" | "triangle";
type Direction = "up" | "down" | "left" | "right" | "diagonal";

type Props = {
  speed?: number;
  squareSize?: number;
  direction?: Direction;
  borderColor?: string;
  hoverFillColor?: string;
  shape?: Shape;
  hoverTrailAmount?: number;
  className?: string;
  style?: CSSProperties;
};

export default function ShapeGrid({
  speed = 0.5,
  squareSize = 40,
  direction = "diagonal",
  borderColor = "#fff",
  hoverFillColor = "#222",
  shape = "square",
  hoverTrailAmount = 5,
  className,
  style
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = ctx;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0;
    let H = 0;
    let phase = 0;
    const trail: Array<{ cx: number; cy: number }> = [];
    let hover: { cx: number; cy: number } | null = null;

    function resize() {
      const parent = canvas!.parentElement;
      const rect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      W = rect.width;
      H = rect.height;
      canvas!.width = Math.floor(W * dpr);
      canvas!.height = Math.floor(H * dpr);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const dir = { x: 0, y: 0 };
    if (direction === "right") dir.x = 1;
    else if (direction === "left") dir.x = -1;
    else if (direction === "down") dir.y = 1;
    else if (direction === "up") dir.y = -1;
    else {
      dir.x = 1;
      dir.y = 1;
    }

    function drawShape(cx: number, cy: number, s: number, fill: boolean, alpha: number) {
      const r = s / 2 - 1;
      g.beginPath();
      if (shape === "circle") {
        g.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (shape === "triangle") {
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy + r);
        g.lineTo(cx - r, cy + r);
        g.closePath();
      } else if (shape === "hexagon") {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const px = cx + r * Math.cos(a);
          const py = cy + r * Math.sin(a);
          i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath();
      } else {
        g.rect(cx - r, cy - r, r * 2, r * 2);
      }
      if (fill) {
        g.globalAlpha = alpha;
        g.fillStyle = hoverFillColor;
        g.fill();
        g.globalAlpha = 1;
      }
      g.strokeStyle = borderColor;
      g.lineWidth = 1;
      g.stroke();
    }

    let raf = 0;
    function frame() {
      if (!reduced) phase = (phase + speed) % squareSize;
      const offX = dir.x * phase;
      const offY = dir.y * phase;

      g.clearRect(0, 0, W, H);
      const cols = Math.ceil(W / squareSize) + 2;
      const rows = Math.ceil(H / squareSize) + 2;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          const cx = c * squareSize + squareSize / 2 + offX;
          const cy = r * squareSize + squareSize / 2 + offY;
          if (cx < -squareSize || cx > W + squareSize || cy < -squareSize || cy > H + squareSize) continue;

          // Is this cell in the hover trail?
          let fill = false;
          let alpha = 0;
          if (hover && Math.abs(cx - hover.cx) < squareSize / 2 && Math.abs(cy - hover.cy) < squareSize / 2) {
            fill = true;
            alpha = 0.9;
          } else if (hoverTrailAmount > 0) {
            for (let t = 0; t < trail.length; t++) {
              if (Math.abs(cx - trail[t].cx) < squareSize / 2 && Math.abs(cy - trail[t].cy) < squareSize / 2) {
                fill = true;
                alpha = 0.5 * (1 - t / trail.length);
                break;
              }
            }
          }
          drawShape(cx, cy, squareSize, fill, alpha);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const offX = dir.x * phase;
      const offY = dir.y * phase;
      const c = Math.round((mx - squareSize / 2 - offX) / squareSize);
      const r = Math.round((my - squareSize / 2 - offY) / squareSize);
      const cx = c * squareSize + squareSize / 2 + offX;
      const cy = r * squareSize + squareSize / 2 + offY;
      const next = { cx, cy };
      if (!hover || hover.cx !== cx || hover.cy !== cy) {
        if (hover && hoverTrailAmount > 0) {
          trail.unshift(hover);
          if (trail.length > hoverTrailAmount) trail.pop();
        }
        hover = next;
      }
    }
    function onLeave() {
      hover = null;
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
    };
  }, [speed, squareSize, direction, borderColor, hoverFillColor, shape, hoverTrailAmount]);

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ display: "block", ...style }} />;
}

import { WaterRipples } from "./water-ripples";

/**
 * Site-wide animated background (ported from WatShop).
 *
 * Every layer is generated from CSS gradients + an inline SVG noise
 * data-URI — crisp at any size, zero network requests, and it recolors
 * itself from the theme CSS variables. Plus an interactive water-ripple
 * canvas that reacts to the cursor and scroll (desktop only). All motion is
 * disabled under prefers-reduced-motion.
 */
export function BackgroundFX() {
  const beams = [
    { left: "12%", delay: "0s", dur: "9s" },
    { left: "38%", delay: "2.5s", dur: "11s" },
    { left: "63%", delay: "1.2s", dur: "8s" },
    { left: "86%", delay: "4s", dur: "12s" }
  ];

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 bg-canvas" />

      {/* Slow conic light sweep, anchored above the fold */}
      <div className="absolute left-1/2 top-[-40%] h-[120vmax] w-[120vmax] -translate-x-1/2 animate-sweep fx-sweep" />

      {/* Drifting color blobs */}
      <div
        className="fx-blob animate-drift left-[6%] top-[8%] h-[38vmax] w-[38vmax] bg-brand"
        style={{ opacity: "var(--fx-blob-a)" }}
      />
      <div
        className="fx-blob animate-drift-rev right-[4%] top-[2%] h-[32vmax] w-[32vmax] bg-tertiary"
        style={{ opacity: "calc(var(--fx-blob-a) * 0.85)" }}
      />
      <div
        className="fx-blob animate-drift-rev bottom-[6%] left-[28%] h-[34vmax] w-[34vmax] bg-accent"
        style={{ opacity: "calc(var(--fx-blob-a) * 0.6)" }}
      />

      {/* Perspective grid, masked toward the top */}
      <div className="absolute inset-0 animate-grid-pan fx-grid" />

      {/* Interactive water ripples — react to cursor + scroll (desktop only) */}
      <WaterRipples />

      {/* Falling light beams */}
      <div className="absolute inset-0">
        {beams.map((b) => (
          <span
            key={b.left}
            className="absolute top-0 h-[45vh] w-px animate-beam-fall fx-beam"
            style={{ left: b.left, animationDelay: b.delay, animationDuration: b.dur }}
          />
        ))}
      </div>

      {/* Film grain */}
      <div className="absolute inset-0 fx-noise" />

      {/* Bottom vignette so content always stays legible */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-canvas to-transparent" />
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import ShapeGrid from "@/components/ui/shape-grid";

/** The grid only shows through transparent shells. Public pages cover it, so they skip the canvas. */
export function ShapeGridGate() {
  const path = usePathname() || "";
  const show = path.startsWith("/dashboard") || path.startsWith("/admin");
  if (!show) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <ShapeGrid
        speed={0.35}
        squareSize={40}
        direction="diagonal"
        borderColor="rgba(120,135,160,0.18)"
        hoverFillColor="#94a3b8"
        shape="square"
        hoverTrailAmount={4}
        className="h-full w-full"
      />
    </div>
  );
}

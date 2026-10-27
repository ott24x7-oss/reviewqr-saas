import { Coffee, Scissors, ShoppingBag } from "lucide-react";
import type { LandingFamily } from "@/lib/tap/landing";

const ICONS = {
  cafe: Coffee,
  salon: Scissors,
  shop: ShoppingBag
} as const;

/** Category mark on a theme gradient. Used when the business has not uploaded a photo. */
export function LandingPlaceholder({ family }: { family: LandingFamily }) {
  const Icon = ICONS[family];
  return (
    <div className="tap-landing-placeholder" data-family={family} aria-hidden="true">
      <Icon strokeWidth={1.4} />
    </div>
  );
}

/**
 * What a catalogue bundle grants after payment.
 * The charged amount is the SKU sale price. Plan list prices stay unchanged.
 */
import { extendSubscriptionEnd } from "../subscription";
import { BUNDLE_MONTHS, BUNDLE_TIERS, type BundleTier } from "./catalog";

export type BundleSpec = {
  includedTier?: string | null;
  includedMonths?: number | null;
  includedLifetime?: boolean;
};

export type BundleGrant =
  | { ok: true; tier: null }
  | { ok: true; tier: "FOUNDER"; lifetime: true; months: 0; endsAt: null }
  | { ok: true; tier: BundleTier; lifetime: false; months: 1 | 6 | 12; endsAt: Date }
  | { ok: false; error: string };

export function founderCapAllows(stock: number, qty: number) {
  return Number.isInteger(stock) && stock >= 0 && Number.isInteger(qty) && qty >= 1 && qty <= stock;
}

export function bundleGrant(spec: BundleSpec, currentEnd: Date | null, now = new Date()): BundleGrant {
  const lifetime = spec.includedLifetime === true;
  const months = spec.includedMonths ?? null;
  const tier = spec.includedTier ?? null;

  if (!lifetime && months == null && !tier) return { ok: true, tier: null };
  if (lifetime && months != null) return { ok: false, error: "A lifetime bundle does not also grant months" };
  if (lifetime) {
    if (tier && tier !== "FOUNDER") return { ok: false, error: "Lifetime bundles use the Founder tier" };
    return { ok: true, tier: "FOUNDER", lifetime: true, months: 0, endsAt: null };
  }
  if (months == null || !BUNDLE_MONTHS.includes(months as (typeof BUNDLE_MONTHS)[number])) {
    return { ok: false, error: "Bundled months are 1, 6, or 12" };
  }
  if (!tier || !BUNDLE_TIERS.includes(tier as BundleTier)) {
    return { ok: false, error: "A bundled plan needs a tier" };
  }
  return {
    ok: true,
    tier: tier as BundleTier,
    lifetime: false,
    months: months as 1 | 6 | 12,
    endsAt: extendSubscriptionEnd(currentEnd, months, now)
  };
}

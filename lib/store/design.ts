export const STORE_DESIGNS = ["CLASSIC", "PREMIUM", "MINIMAL", "BOLD"] as const;
export type StoreDesign = (typeof STORE_DESIGNS)[number];

/** Owner picker. The first entry is the default. */
export const DESIGN_PICKER: { id: StoreDesign; label: string }[] = [
  { id: "CLASSIC", label: "Classic" },
  { id: "PREMIUM", label: "Premium Store" },
  { id: "MINIMAL", label: "Minimal" },
  { id: "BOLD", label: "Bold Dark" }
];

/** Owner override. Anything else, including a missing row, stays on Classic. */
export function resolveDesign(value: string | null | undefined): StoreDesign {
  if (value === "PREMIUM" || value === "MINIMAL" || value === "BOLD" || value === "CLASSIC") return value;
  return "CLASSIC";
}

/** Circle label when a category has no photo. Latin letters are uppercase. */
export function categoryInitials(name: string) {
  const trimmed = name.trim();
  const first = Array.from(trimmed)[0];
  if (!first) return "?";
  return /[a-z]/i.test(first) ? first.toUpperCase() : first;
}

/** Whole percent off. Zero when there is no higher MRP. */
export function percentOff(pricePaise: number, mrpPaise: number | null | undefined) {
  if (mrpPaise == null || mrpPaise <= pricePaise || mrpPaise <= 0) return 0;
  return Math.round(((mrpPaise - pricePaise) / mrpPaise) * 100);
}

export function bannerIsVisible(expiresAt: Date | string | null | undefined, now: Date) {
  if (!expiresAt) return true;
  const time = new Date(expiresAt).getTime();
  if (Number.isNaN(time)) return true;
  return time > now.getTime();
}

export function soonestExpiry<T extends { expiresAt: Date | string | null }>(rows: T[], now: Date): T | null {
  let best: T | null = null;
  let bestTime = Infinity;
  for (const row of rows) {
    if (!row.expiresAt) continue;
    const time = new Date(row.expiresAt).getTime();
    if (Number.isNaN(time) || time <= now.getTime()) continue;
    if (time < bestTime) {
      best = row;
      bestTime = time;
    }
  }
  return best;
}

export type DesignBanner = {
  id: string;
  title: string;
  body: string;
  expiresAt: Date | string | null;
};

export type DesignCoupon = {
  id: string;
  code: string;
  kind: "PERCENT" | "FLAT";
  amount: number;
  expiresAt: Date | string | null;
  active: boolean;
};

export type DealClock = {
  kind: "banner" | "coupon";
  id: string;
  expiresAt: string;
  title: string;
  detail: string;
};

/** The soonest future banner or coupon expiry. Null hides the deal and the flash row. */
export function dealClock(banners: DesignBanner[], coupons: DesignCoupon[], now: Date): DealClock | null {
  const tagged = [
    ...banners.map((banner) => ({
      kind: "banner" as const,
      id: banner.id,
      expiresAt: banner.expiresAt,
      title: banner.title,
      detail: banner.body
    })),
    ...coupons
      .filter((coupon) => coupon.active)
      .map((coupon) => ({
        kind: "coupon" as const,
        id: coupon.id,
        expiresAt: coupon.expiresAt,
        title: coupon.code,
        detail: coupon.kind === "PERCENT" ? `${Math.round(coupon.amount)}% off` : `₹${Math.round(coupon.amount / 100)} off`
      }))
  ];
  const best = soonestExpiry(tagged, now);
  if (!best?.expiresAt) return null;
  return {
    kind: best.kind,
    id: best.id,
    expiresAt: new Date(best.expiresAt).toISOString(),
    title: best.title,
    detail: best.detail
  };
}

export function flashItems<T extends { pricePaise: number; mrpPaise: number | null }>(items: T[], limit = 8) {
  return items.filter((item) => percentOff(item.pricePaise, item.mrpPaise) > 0).slice(0, limit);
}

/** Flash sale shares the deal clock. No future expiry means no row. */
export function showFlash<T extends { pricePaise: number; mrpPaise: number | null }>(items: T[], clock: DealClock | null, limit = 8) {
  if (!clock) return [];
  return flashItems(items, limit);
}

export function recentItems<T extends { createdAt: string }>(items: T[], limit = 8) {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

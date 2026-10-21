export type CouponKind = "PERCENT" | "FLAT";

export type CouponRule = {
  kind: CouponKind;
  amount: number;
  minSubtotalPaise: number;
  expiresAt: Date | string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export type CouponFail = "invalid" | "expired" | "minimum" | "used";

/** Uppercase letters and digits only, so "save 10" and "SAVE10" are one code. */
export function normalizeCouponCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
}

/** End of the chosen calendar day in Asia/Kolkata. */
export function endOfKolkataDay(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T18:29:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function couponDiscount(coupon: CouponRule, subtotalPaise: number, now = new Date()):
  | { ok: true; discountPaise: number }
  | { ok: false; code: CouponFail } {
  const subtotal = Math.max(0, Math.round(subtotalPaise));
  const amount = Math.round(coupon.amount);
  if (!coupon.active || amount <= 0) return { ok: false, code: "invalid" };
  if (coupon.kind === "PERCENT" && (amount < 1 || amount > 100)) return { ok: false, code: "invalid" };
  if (coupon.kind !== "PERCENT" && coupon.kind !== "FLAT") return { ok: false, code: "invalid" };

  const expires = coupon.expiresAt ? new Date(coupon.expiresAt) : null;
  if (expires && !Number.isNaN(expires.getTime()) && expires.getTime() < now.getTime()) {
    return { ok: false, code: "expired" };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, code: "used" };
  }
  if (subtotal < Math.max(0, Math.round(coupon.minSubtotalPaise))) {
    return { ok: false, code: "minimum" };
  }
  const discount = coupon.kind === "PERCENT" ? Math.round((subtotal * amount) / 100) : amount;
  return { ok: true, discountPaise: Math.min(subtotal, Math.max(0, discount)) };
}

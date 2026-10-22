/**
 * Shop quote. Prices are GST-inclusive paise.
 * A coupon applies to the subtotal, then a referral applies to what remains.
 * The discount is shared across lines, then each line is split at its own GST rate.
 */
import { splitGst } from "../subscription";

export type DiscountOffer = {
  percentOff?: number | null;
  flatPaise?: number | null;
  active: boolean;
  expiresAt?: Date | string | null;
};

export type QuoteLineInput = {
  sku: string;
  qty: number;
  unitPaise: number;
  gstPercent: number;
  stock: number;
  minQty: number;
  active?: boolean;
  includedLifetime?: boolean;
};

export type QuoteLine = {
  sku: string;
  qty: number;
  grossPaise: number;
  discountPaise: number;
  netPaise: number;
  gstPercent: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
};

export type QuoteOk = {
  ok: true;
  lines: QuoteLine[];
  subtotalPaise: number;
  couponPaise: number;
  referralPaise: number;
  couponRejected: boolean;
  referralRejected: boolean;
  discountPaise: number;
  totalPaise: number;
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
};

export type QuoteResult = QuoteOk | { ok: false; error: string };

/** Percent wins when it is set. An inactive or expired offer discounts nothing. */
export function offerDiscountPaise(
  offer: DiscountOffer | null | undefined,
  basePaise: number,
  now = new Date()
): { paise: number; rejected: boolean } {
  if (!offer) return { paise: 0, rejected: false };
  const expires = offer.expiresAt ? new Date(offer.expiresAt) : null;
  const expired = expires != null && !Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime();
  const percentSet = offer.percentOff != null;
  const flatSet = offer.flatPaise != null;
  const percentOk = percentSet && Number.isInteger(offer.percentOff) && (offer.percentOff as number) >= 0 && (offer.percentOff as number) <= 100;
  const flatOk = flatSet && Number.isInteger(offer.flatPaise) && (offer.flatPaise as number) >= 0;
  const usable = percentSet ? percentOk : flatOk;
  if (!offer.active || expired || !usable) return { paise: 0, rejected: true };
  const base = Math.max(0, Math.floor(basePaise));
  const raw = percentSet
    ? Math.round((base * (offer.percentOff as number)) / 100)
    : Math.min(base, offer.flatPaise as number);
  return { paise: Math.max(0, Math.min(base, raw)), rejected: false };
}

function allocate(amounts: number[], discount: number): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0 || discount <= 0) return amounts.map(() => 0);
  const capped = Math.min(discount, total);
  let assigned = 0;
  return amounts.map((amount, index) => {
    if (index === amounts.length - 1) return capped - assigned;
    const share = Math.floor((capped * amount) / total);
    assigned += share;
    return share;
  });
}

export function quoteShop(input: {
  lines: QuoteLineInput[];
  coupon?: DiscountOffer | null;
  referral?: DiscountOffer | null;
  sameState: boolean;
  now?: Date;
}): QuoteResult {
  if (!input.lines.length) return { ok: false, error: "Add at least one item" };
  const grosses: number[] = [];
  for (const line of input.lines) {
    if (line.active === false) return { ok: false, error: "This item is not for sale" };
    if (!Number.isInteger(line.qty) || line.qty < 1) return { ok: false, error: "Quantity must be a whole number" };
    if (!Number.isInteger(line.minQty) || line.qty < line.minQty) return { ok: false, error: "Quantity is below the minimum order" };
    if (!Number.isInteger(line.stock) || line.qty > line.stock) {
      return { ok: false, error: line.includedLifetime ? "Founder lifetime is sold out" : "Not enough stock" };
    }
    if (!Number.isInteger(line.unitPaise) || line.unitPaise <= 0) return { ok: false, error: "Sale price must be a positive number of paise" };
    grosses.push(line.unitPaise * line.qty);
  }

  const now = input.now ?? new Date();
  const subtotalPaise = grosses.reduce((sum, amount) => sum + amount, 0);
  const coupon = offerDiscountPaise(input.coupon, subtotalPaise, now);
  const referral = offerDiscountPaise(input.referral, subtotalPaise - coupon.paise, now);
  const discountPaise = Math.min(subtotalPaise, coupon.paise + referral.paise);
  const shares = allocate(grosses, discountPaise);

  const lines: QuoteLine[] = input.lines.map((line, index) => {
    const grossPaise = grosses[index];
    const discount = shares[index];
    const netPaise = grossPaise - discount;
    const tax = splitGst(netPaise, line.gstPercent, input.sameState);
    return {
      sku: line.sku,
      qty: line.qty,
      grossPaise,
      discountPaise: discount,
      netPaise,
      gstPercent: line.gstPercent,
      taxablePaise: tax.taxable,
      cgstPaise: tax.cgst,
      sgstPaise: tax.sgst,
      igstPaise: tax.igst
    };
  });

  const sum = (key: keyof Pick<QuoteLine, "taxablePaise" | "cgstPaise" | "sgstPaise" | "igstPaise">) =>
    lines.reduce((total, line) => total + line[key], 0);

  return {
    ok: true,
    lines,
    subtotalPaise,
    couponPaise: coupon.paise,
    referralPaise: referral.paise,
    couponRejected: coupon.rejected,
    referralRejected: referral.rejected,
    discountPaise,
    totalPaise: subtotalPaise - discountPaise,
    taxablePaise: sum("taxablePaise"),
    cgstPaise: sum("cgstPaise"),
    sgstPaise: sum("sgstPaise"),
    igstPaise: sum("igstPaise")
  };
}

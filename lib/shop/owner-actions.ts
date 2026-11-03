import { isShopOrderStatus } from "./order-status";

const CANCELLABLE_BEFORE_PRODUCTION = new Set([
  "PENDING_PAYMENT", "PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED"
]);
const ADDRESS_EDITABLE_BEFORE_DISPATCH = new Set([
  "PENDING_PAYMENT", "PAID", "PROOF_SENT", "CHANGES_REQUESTED", "APPROVED", "PRINTING", "NFC_WRITTEN", "PACKED"
]);

export function canChangeShopAddress(status: string, hasShipment: boolean) {
  return ADDRESS_EDITABLE_BEFORE_DISPATCH.has(status) && !hasShipment;
}

export type ShopCancelDecision =
  | { allowed: true; kind: "cancel"; refundPaise: 0; refundMethod: null }
  | { allowed: true; kind: "request"; refundPaise: number; refundMethod: "ORIGINAL_PAYMENT_METHOD" | null }
  | { allowed: false; reason: string };

/** Cancellation is self-service only while unpaid; paid orders need admin review. */
export function shopCancelDecision(status: string, paymentStatus: string, totalPaise: number, paidPaise = totalPaise): ShopCancelDecision {
  if (!isShopOrderStatus(status) || !CANCELLABLE_BEFORE_PRODUCTION.has(status)) {
    return { allowed: false, reason: "This order can no longer be cancelled from the owner app" };
  }
  if (status === "PENDING_PAYMENT" && paymentStatus === "PENDING") {
    return { allowed: true, kind: "cancel", refundPaise: 0, refundMethod: null };
  }
  if (paymentStatus === "PAID") {
    return { allowed: true, kind: "request", refundPaise: Math.max(0, paidPaise), refundMethod: "ORIGINAL_PAYMENT_METHOD" };
  }
  if (paymentStatus === "REFUNDED") {
    return { allowed: true, kind: "cancel", refundPaise: 0, refundMethod: null };
  }
  return { allowed: false, reason: "This order payment cannot be cancelled right now" };
}

export type BuyAgainLine = { sku: string; qty: number; unbranded: boolean; design: unknown; name: string };
export type CurrentVariant = { sku: string; active: boolean; stock: number; minQty: number };

/** Return available variants, preserving the purchase choices; unavailable ones are listed by name. */
export function splitBuyAgainLines(lines: BuyAgainLine[], variants: CurrentVariant[]) {
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
  const available: BuyAgainLine[] = [];
  const skipped: string[] = [];
  for (const line of lines) {
    const variant = bySku.get(line.sku);
    if (!variant?.active || line.qty < variant.minQty || line.qty > variant.stock) skipped.push(line.name);
    else available.push(line);
  }
  return { available, skipped };
}

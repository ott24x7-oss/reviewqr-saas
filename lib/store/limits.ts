/** Public store abuse windows. Both the IP and the store must pass. */
export const STORE_ORDER_LIMIT = { limit: 10, windowSeconds: 10 * 60 };
export const STORE_COUPON_LIMIT = { limit: 20, windowSeconds: 10 * 60 };

export function storeOrderRateKeys(ip: string, businessId: string) {
  return [`store-order:ip:${ip}`, `store-order:store:${businessId}`] as const;
}

export function storeCouponRateKeys(ip: string, businessId: string) {
  return [`store-coupon:ip:${ip}`, `store-coupon:store:${businessId}`] as const;
}

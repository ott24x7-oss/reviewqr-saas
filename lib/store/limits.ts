/** Public store abuse windows. Both the IP and the store must pass. */
export const STORE_ORDER_LIMIT = { limit: 10, windowSeconds: 10 * 60 };
export const STORE_COUPON_LIMIT = { limit: 20, windowSeconds: 10 * 60 };

export function storeOrderRateKeys(ip: string, businessId: string) {
  return [`store-order:ip:${ip}`, `store-order:store:${businessId}`] as const;
}

export function storeCouponRateKeys(ip: string, businessId: string) {
  return [`store-coupon:ip:${ip}`, `store-coupon:store:${businessId}`] as const;
}

export const BOOKING_LIMIT = { limit: 8, windowSeconds: 10 * 60 };
/** Independent of IP and phone, so rotating both still cannot flood one business. */
export const BOOKING_BUSINESS_LIMIT = { limit: 20, windowSeconds: 10 * 60 };

export function bookingRateKeys(ip: string, phone: string) {
  return [`booking:ip:${ip}`, `booking:phone:${phone}`] as const;
}

export function bookingBusinessRateKey(businessId: string) {
  return `booking-business:${businessId}`;
}

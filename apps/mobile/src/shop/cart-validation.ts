export type ShopAddressDraft = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export function validateShopAddress(address: ShopAddressDraft) {
  if (!address.name.trim()) return "name" as const;
  if (!/^[6-9]\d{9}$/.test(address.phone.replace(/\s+/g, ""))) return "phone" as const;
  if (!address.line1.trim()) return "line1" as const;
  if (!address.city.trim()) return "city" as const;
  if (!address.state.trim()) return "state" as const;
  if (!/^\d{6}$/.test(address.pincode.trim())) return "pincode" as const;
  return null;
}

export function normalizeShopQuantity(value: number, minQty: number, stock: number) {
  const minimum = Math.max(1, Math.floor(minQty || 1));
  const parsed = Number.isFinite(value) ? Math.floor(value) : minimum;
  return Math.min(Math.max(minimum, parsed), Math.max(minimum, Math.floor(stock || minimum)));
}

export function cartStepError(input: {
  lines: { qty: number; minQty: number; stock: number; active: boolean; designError: string | null }[];
  needsShipping: boolean;
  addressId: string | null;
  quote: { ok: boolean; error?: string; couponRejected?: boolean; referralRejected?: boolean };
}) {
  if (!input.lines.length) return "empty" as const;
  const designError = input.lines.find((line) => line.designError)?.designError;
  if (designError) return designError;
  if (input.lines.some((line) => !line.active || line.qty < line.minQty || line.qty > line.stock)) return "items" as const;
  if (input.needsShipping && !input.addressId) return "address" as const;
  if (!input.quote.ok) return input.quote.error || "quote";
  if (input.quote.couponRejected) return "coupon" as const;
  if (input.quote.referralRejected) return "referral" as const;
  return null;
}

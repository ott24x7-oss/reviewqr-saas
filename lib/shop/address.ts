/** Saved shipping address for a ReviewQR shop order. */

export type AddressInput = {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  label?: string | null;
};

const PINCODE = /^\d{6}$/;
const MOBILE = /^[6-9]\d{9}$/;

export function addressError(input: AddressInput): string | null {
  if (!input.name.trim()) return "Name is required";
  const phone = input.phone.replace(/\s+/g, "");
  if (!MOBILE.test(phone)) return "Phone must be a 10-digit Indian mobile number";
  if (!input.line1.trim()) return "Address line is required";
  if (!input.city.trim()) return "City is required";
  if (!input.state.trim()) return "State is required";
  if (!PINCODE.test(input.pincode.trim())) return "Pincode must be 6 digits";
  return null;
}

/** A blank state is treated as the seller's state, so the split stays CGST and SGST. */
export function sameSupplyState(buyerState: string | null | undefined, sellerState: string | null | undefined) {
  const buyer = (buyerState || "").trim().toLowerCase();
  const seller = (sellerState || "").trim().toLowerCase();
  if (!buyer || !seller) return true;
  return buyer === seller;
}

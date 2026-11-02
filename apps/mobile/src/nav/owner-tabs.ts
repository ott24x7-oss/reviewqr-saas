export const OWNER_VISIBLE_TABS = ["index", "orders", "shop", "more"] as const;
export const OWNER_TAB_SLOTS = ["index", "orders", "qr", "shop", "more"] as const;

export type OwnerTabName = (typeof OWNER_VISIBLE_TABS)[number];

/** The owner QR button opens the focused, customer-facing QR view. */
export function ownerShowQrTarget() {
  return { pathname: "/(app)/tap", params: { section: "qr" } } as const;
}


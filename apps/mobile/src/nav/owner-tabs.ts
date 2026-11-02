export const OWNER_VISIBLE_TABS = ["index", "orders", "reviews", "shop", "more"] as const;
export const OWNER_TAB_SLOTS = ["index", "orders", "reviews", "qr", "shop", "more"] as const;

export type OwnerTabName = (typeof OWNER_VISIBLE_TABS)[number];


import { resolveChoice, type SellableAddOn, type SellableVariant } from "./variants";
import { ORDER_STATUSES, readStatusEvents, type OrderStatus, type StatusEvent } from "./order-status";

export type PublicItem = { name: string; qty: number };

export type ReorderLine = {
  id: string;
  variantId: string;
  addonIds: string[];
  qty: number;
};

export type PublicStatus = {
  number: string;
  businessName: string;
  status: OrderStatus;
  lang: "en" | "hi";
  createdAt: string;
  orderType: string;
  items: PublicItem[];
  totalPaise: number;
  events: StatusEvent[];
  reorderCode: string | null;
};

type StoredLine = {
  id: string;
  name: string;
  qty: number;
  note: string;
  variantId: string;
  addonIds: string[];
};

export function readStoredLines(value: unknown): StoredLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const row = line as { id?: unknown; name?: unknown; qty?: unknown; note?: unknown; variantId?: unknown; addonIds?: unknown };
    if (typeof row.name !== "string" || !row.name.trim()) return [];
    const addonIds = Array.isArray(row.addonIds) ? row.addonIds.filter((id): id is string => typeof id === "string") : [];
    return [{
      id: typeof row.id === "string" ? row.id : "",
      name: row.name,
      qty: typeof row.qty === "number" && row.qty > 0 ? Math.min(20, Math.round(row.qty)) : 1,
      note: typeof row.note === "string" ? row.note : "",
      variantId: typeof row.variantId === "string" ? row.variantId : "",
      addonIds
    }];
  });
}

/** Customer page. Phone, address, pincode, name, and notes stay off this object. */
export function toPublicStatus(source: {
  number: string;
  businessName: string;
  status: string;
  lang?: string | null;
  createdAt: Date | string;
  orderType?: string | null;
  items: unknown;
  totalPaise: number;
  events: unknown;
  reorderCode?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  tableOrAddress?: string | null;
  pincode?: string | null;
  note?: string | null;
}): PublicStatus {
  const status = ORDER_STATUSES.includes(source.status as OrderStatus) ? (source.status as OrderStatus) : "NEW";
  const created = source.createdAt instanceof Date ? source.createdAt : new Date(source.createdAt);
  const createdAt = Number.isNaN(created.getTime()) ? new Date(0).toISOString() : created.toISOString();
  const events = readStatusEvents(source.events);
  return {
    number: source.number,
    businessName: source.businessName,
    status,
    lang: source.lang === "hi" ? "hi" : "en",
    createdAt,
    orderType: source.orderType || "",
    items: readStoredLines(source.items).map((line) => ({ name: line.name, qty: line.qty })),
    totalPaise: source.totalPaise,
    events: events.length > 0 ? events : [{ status, at: createdAt }],
    reorderCode: source.reorderCode || null
  };
}

export type ReorderCatalogItem = {
  id: string;
  available: boolean;
  pricePaise: number;
  variants: SellableVariant[];
  addOns: SellableAddOn[];
};

/** Lines the menu can still add. Unavailable items and out-of-stock choices are left out. */
export function keepReorderLines(items: unknown, catalog: ReorderCatalogItem[]): ReorderLine[] {
  const byId = new Map(catalog.map((item) => [item.id, item]));
  return readStoredLines(items).flatMap((line) => {
    const item = byId.get(line.id);
    if (!item || !item.available) return [];
    const choice = resolveChoice({
      itemPricePaise: item.pricePaise,
      variants: item.variants,
      addOns: item.addOns,
      variantId: line.variantId,
      addonIds: line.addonIds
    });
    if (!choice.ok) return [];
    return [{
      id: line.id,
      variantId: choice.variant?.id || "",
      addonIds: choice.addOns.map((addOn) => addOn.id),
      qty: line.qty
    }];
  });
}

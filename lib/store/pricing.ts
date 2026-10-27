import { isOpenAt, type WeekHours } from "../tap/hours";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

export type StoreRules = {
  holiday: boolean;
  hours: WeekHours | null;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  pincodes: string[];
  deliveryChargePaise: number;
  freeDeliveryAbovePaise: number | null;
  minOrderPaise: number;
  packingChargePaise: number;
  gstEnabled: boolean;
  gstPercent: number;
  pricesIncludeGst: boolean;
  prepMinutes: number;
};

export const DEFAULT_STORE_RULES: StoreRules = {
  holiday: false,
  hours: null,
  dineIn: true,
  takeaway: true,
  delivery: false,
  pincodes: [],
  deliveryChargePaise: 0,
  freeDeliveryAbovePaise: null,
  minOrderPaise: 0,
  packingChargePaise: 0,
  gstEnabled: false,
  gstPercent: 5,
  pricesIncludeGst: true,
  prepMinutes: 20
};

export type QuoteOk = {
  ok: true;
  subtotalPaise: number;
  discountPaise: number;
  deliveryPaise: number;
  packingPaise: number;
  gstPaise: number;
  totalPaise: number;
  pricesIncludeGst: boolean;
  orderForLater: boolean;
  prepMinutes: number;
};

export type QuoteFail = {
  ok: false;
  code: "order_type" | "min_order" | "pincode";
  shortfallPaise?: number;
};

export function parsePincodeList(value: string) {
  const found: string[] = [];
  for (const part of value.split(/[^0-9]+/)) {
    if (/^\d{6}$/.test(part) && !found.includes(part)) found.push(part);
  }
  return found;
}

export function normalizePincode(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{6}$/.test(digits) ? digits : "";
}

export function enabledOrderTypes(rules: StoreRules): OrderType[] {
  const types: OrderType[] = [];
  if (rules.dineIn) types.push("DINE_IN");
  if (rules.takeaway) types.push("TAKEAWAY");
  if (rules.delivery) types.push("DELIVERY");
  return types;
}

export function orderTypesForCatalog(rules: StoreRules, catalogMode: "MENU" | "SERVICES" | "BOTH"): OrderType[] {
  return catalogMode === "SERVICES" ? [] : enabledOrderTypes(rules);
}

/** Holiday, or hours that say closed. Missing hours are not treated as closed. */
export function isOrderForLater(rules: Pick<StoreRules, "holiday" | "hours">, now = new Date()) {
  if (rules.holiday) return true;
  const open = isOpenAt(rules.hours, now);
  return open === false;
}

function money(value: number) {
  return Math.max(0, Math.round(value));
}

export function quoteOrder(input: {
  rules: StoreRules;
  orderType: OrderType;
  subtotalPaise: number;
  discountPaise?: number;
  pincode?: string;
  now?: Date;
  orderForLater?: boolean;
}): QuoteOk | QuoteFail {
  const rules = input.rules;
  if (!enabledOrderTypes(rules).includes(input.orderType)) {
    return { ok: false, code: "order_type" };
  }
  const subtotalPaise = money(input.subtotalPaise);
  if (subtotalPaise < money(rules.minOrderPaise)) {
    return { ok: false, code: "min_order", shortfallPaise: money(rules.minOrderPaise) - subtotalPaise };
  }
  if (input.orderType === "DELIVERY") {
    const pincode = normalizePincode(input.pincode || "");
    if (!pincode || (rules.pincodes.length > 0 && !rules.pincodes.includes(pincode))) {
      return { ok: false, code: "pincode" };
    }
  }
  const discountPaise = Math.min(subtotalPaise, money(input.discountPaise || 0));
  const packingPaise = input.orderType === "DINE_IN" ? 0 : money(rules.packingChargePaise);
  let deliveryPaise = 0;
  if (input.orderType === "DELIVERY") {
    const freeAt = rules.freeDeliveryAbovePaise;
    deliveryPaise = freeAt != null && subtotalPaise >= money(freeAt) ? 0 : money(rules.deliveryChargePaise);
  }
  const base = Math.max(0, subtotalPaise - discountPaise + packingPaise);
  const percent = Math.min(28, Math.max(0, Math.round(rules.gstPercent)));
  let gstPaise = 0;
  const include = rules.pricesIncludeGst !== false;
  if (rules.gstEnabled && percent > 0) {
    gstPaise = include
      ? Math.round((base * percent) / (100 + percent))
      : Math.round((base * percent) / 100);
  }
  const totalPaise = base + deliveryPaise + (include || !rules.gstEnabled ? 0 : gstPaise);
  return {
    ok: true,
    subtotalPaise,
    discountPaise,
    deliveryPaise,
    packingPaise,
    gstPaise,
    totalPaise,
    pricesIncludeGst: include,
    orderForLater: input.orderForLater ?? isOrderForLater(rules, input.now),
    prepMinutes: Math.min(240, Math.max(1, Math.round(rules.prepMinutes || 20)))
  };
}

type SettingsRow = {
  holiday?: boolean;
  hours?: unknown;
  dineIn?: boolean;
  takeaway?: boolean;
  delivery?: boolean;
  deliveryPincodes?: string;
  deliveryChargePaise?: number;
  freeDeliveryAbovePaise?: number | null;
  minOrderPaise?: number;
  packingChargePaise?: number;
  gstEnabled?: boolean;
  gstPercent?: number;
  pricesIncludeGst?: boolean;
  prepMinutes?: number;
};

function hoursValue(value: unknown): WeekHours | null {
  if (!value || typeof value !== "object") return null;
  const out: WeekHours = {};
  let any = false;
  for (const day of ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const) {
    const row = (value as Record<string, unknown>)[day];
    if (!row || typeof row !== "object") continue;
    const open = String((row as { open?: unknown }).open || "");
    const close = String((row as { close?: unknown }).close || "");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) continue;
    out[day] = { open, close };
    any = true;
  }
  return any ? out : null;
}

export function rulesFromSettings(row: SettingsRow | null | undefined, fallbackHours: WeekHours | null): StoreRules {
  if (!row) return { ...DEFAULT_STORE_RULES, hours: fallbackHours };
  const ownHours = hoursValue(row.hours);
  return {
    holiday: row.holiday === true,
    hours: ownHours || fallbackHours,
    dineIn: row.dineIn !== false,
    takeaway: row.takeaway !== false,
    delivery: row.delivery === true,
    pincodes: parsePincodeList(row.deliveryPincodes || ""),
    deliveryChargePaise: money(row.deliveryChargePaise || 0),
    freeDeliveryAbovePaise:
      row.freeDeliveryAbovePaise == null ? null : money(row.freeDeliveryAbovePaise),
    minOrderPaise: money(row.minOrderPaise || 0),
    packingChargePaise: money(row.packingChargePaise || 0),
    gstEnabled: row.gstEnabled === true,
    gstPercent: Math.min(28, Math.max(0, Math.round(row.gstPercent ?? 5))),
    pricesIncludeGst: row.pricesIncludeGst !== false,
    prepMinutes: Math.min(240, Math.max(1, Math.round(row.prepMinutes || 20)))
  };
}

import { whatsAppNumberUrl } from "../tap/links";

export const ORDER_STATUSES = [
  "NEW",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "New",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed"
};

const NEXT_LABEL: Record<OrderStatus, string> = {
  NEW: "Mark new",
  ACCEPTED: "Accept",
  REJECTED: "Reject",
  PREPARING: "Preparing",
  READY: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed"
};

export function statusActionLabel(status: OrderStatus) {
  return NEXT_LABEL[status];
}

/** Reject is only allowed from New or Accepted. The same status is a no-op. Every other status can be chosen. */
export function canSetStatus(from: OrderStatus, to: OrderStatus) {
  if (!ORDER_STATUSES.includes(from) || !ORDER_STATUSES.includes(to)) return false;
  if (from === to) return true;
  if (to === "REJECTED") return from === "NEW" || from === "ACCEPTED";
  return true;
}

export function statusMessage(status: OrderStatus, number: string, businessName: string, hindi: boolean) {
  const name = businessName.trim() || "the store";
  if (hindi) {
    if (status === "ACCEPTED") return `${name} ने ऑर्डर ${number} स्वीकार कर लिया है।`;
    if (status === "REJECTED") return `माफ़ करें, ${name} अभी ऑर्डर ${number} नहीं ले सकता।`;
    if (status === "PREPARING") return `${name} ऑर्डर ${number} तैयार कर रहा है।`;
    if (status === "READY") return `${name} पर ऑर्डर ${number} तैयार है।`;
    if (status === "OUT_FOR_DELIVERY") return `ऑर्डर ${number} डिलीवरी के लिए निकल गया है।`;
    if (status === "COMPLETED") return `ऑर्डर ${number} पूरा हो गया। धन्यवाद।`;
    return `${name} पर नया ऑर्डर ${number}।`;
  }
  if (status === "ACCEPTED") return `Your order ${number} at ${name} is accepted.`;
  if (status === "REJECTED") return `Sorry, ${name} can't take order ${number} right now.`;
  if (status === "PREPARING") return `${name} is preparing order ${number}.`;
  if (status === "READY") return `Order ${number} at ${name} is ready.`;
  if (status === "OUT_FOR_DELIVERY") return `Order ${number} from ${name} is out for delivery.`;
  if (status === "COMPLETED") return `Order ${number} at ${name} is complete. Thank you.`;
  return `New order ${number} at ${name}.`;
}

/** WhatsApp link for the customer. Missing phone or consent returns null. */
export function customerStatusLink(phone: string | null | undefined, consentAt: Date | string | null | undefined, text: string) {
  if (!phone || !consentAt) return null;
  const base = whatsAppNumberUrl(phone);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export type StatusEvent = { status: OrderStatus; at: string };

export function readStatusEvents(value: unknown): StatusEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as { status?: unknown; at?: unknown };
    if (typeof row.status !== "string" || !ORDER_STATUSES.includes(row.status as OrderStatus)) return [];
    if (typeof row.at !== "string") return [];
    return [{ status: row.status as OrderStatus, at: row.at }];
  });
}

export function appendStatusEvent(value: unknown, status: OrderStatus, at = new Date()): StatusEvent[] {
  const list = readStatusEvents(value);
  const stamp = at.toISOString();
  const last = list[list.length - 1];
  if (last?.status === status) return list;
  return [...list, { status, at: stamp }];
}

/** Older orders have no timeline. Seed the status they already have, then append the new one. */
export function nextStatusEvents(value: unknown, from: OrderStatus, to: OrderStatus, fromAt: Date, at = new Date()) {
  const current = readStatusEvents(value);
  const seeded = current.length === 0 ? appendStatusEvent(current, from, fromAt) : current;
  return appendStatusEvent(seeded, to, at);
}

/** Digits to store, or nothing. A phone is kept only when the customer consented and the number can open WhatsApp. */
export function consentedPhone(raw: string | null | undefined, consent: boolean | null | undefined, at = new Date()) {
  if (consent !== true) return { customerPhone: null as string | null, consentAt: null as Date | null };
  const url = whatsAppNumberUrl(raw);
  if (!url) return { customerPhone: null, consentAt: null };
  return { customerPhone: url.replace("https://wa.me/", ""), consentAt: at };
}

export type OrderLineView = { name: string; qty: number; note: string };

export type OrderCard = {
  id: string;
  number: string;
  businessName: string;
  status: OrderStatus;
  canManage: boolean;
  createdAt: string;
  customerName: string;
  place: string;
  note: string;
  orderType: string;
  pincode: string;
  payment: string;
  totalPaise: number;
  items: OrderLineView[];
  phone: string | null;
  lang: "en" | "hi";
  whatsAppUrl: string | null;
};

export type OrderCardSource = {
  id: string;
  number: string;
  businessName: string;
  status: string;
  createdAt: Date | string;
  customerName?: string | null;
  place?: string | null;
  note?: string | null;
  orderType?: string | null;
  pincode?: string | null;
  payment?: string | null;
  totalPaise: number;
  items: unknown;
  customerPhone?: string | null;
  consentAt?: Date | string | null;
  lang?: string | null;
};

export function toOrderCard(source: OrderCardSource, canManage: boolean): OrderCard {
  const status = ORDER_STATUSES.includes(source.status as OrderStatus) ? (source.status as OrderStatus) : "NEW";
  const lang = source.lang === "hi" ? "hi" : "en";
  const phone = source.consentAt && source.customerPhone ? source.customerPhone : null;
  const created = source.createdAt instanceof Date ? source.createdAt : new Date(source.createdAt);
  const createdAt = Number.isNaN(created.getTime()) ? new Date(0).toISOString() : created.toISOString();
  return {
    id: source.id,
    number: source.number,
    businessName: source.businessName,
    status,
    canManage,
    createdAt,
    customerName: source.customerName || "",
    place: source.place || "",
    note: source.note || "",
    orderType: source.orderType || "",
    pincode: source.pincode || "",
    payment: source.payment || "",
    totalPaise: source.totalPaise,
    items: readLines(source.items),
    phone,
    lang,
    whatsAppUrl: customerStatusLink(phone, source.consentAt, statusMessage(status, source.number, source.businessName, lang === "hi"))
  };
}

function readLines(value: unknown): OrderLineView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const row = line as { name?: unknown; qty?: unknown; note?: unknown };
    if (typeof row.name !== "string") return [];
    return [{
      name: row.name,
      qty: typeof row.qty === "number" && row.qty > 0 ? Math.round(row.qty) : 1,
      note: typeof row.note === "string" ? row.note : ""
    }];
  });
}

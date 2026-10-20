import { directionsUrl, telUrl, whatsAppNumberUrl } from "./links";
import { LINK_TYPES, linkNeedsUrl, type LinkType, type StoredLink } from "./presets";
import { safeTapUrl } from "./urls";

export type KnownContact = {
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  googleReviewUrl?: string | null;
  whatsappNumber?: string | null;
};

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

function plainText(value: string, max: number) {
  return value.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
}

export function normalizeLinks(input: unknown): { links: StoredLink[] } | { error: string } {
  if (!Array.isArray(input)) return { error: "Add the page buttons as a list" };
  if (input.length > 40) return { error: "A page can have at most 40 buttons" };
  const links: StoredLink[] = [];
  const keys = new Set<string>();
  for (let index = 0; index < input.length; index += 1) {
    const row = input[index];
    if (!row || typeof row !== "object") return { error: "A button is missing its details" };
    const item = row as Record<string, unknown>;
    const type = typeof item.type === "string" && (LINK_TYPES as readonly string[]).includes(item.type) ? (item.type as LinkType) : null;
    if (!type) return { error: "Choose a button type" };
    const enabled = item.enabled !== false;
    const url = cleanUrl(type, typeof item.url === "string" ? item.url : "", enabled);
    if (typeof url !== "string") return url;
    let key = slugKey(typeof item.key === "string" ? item.key : "", type, index);
    while (keys.has(key)) key = `${key}-${index}`;
    keys.add(key);
    const labelEn = plainText(typeof item.labelEn === "string" ? item.labelEn : "", 80) || type;
    const labelHi = plainText(typeof item.labelHi === "string" ? item.labelHi : "", 80);
    const schedule = readSchedule(item.schedule);
    if (schedule && "error" in schedule) return schedule;
    links.push({
      key,
      type,
      labelEn,
      labelHi,
      enabled,
      sort: index * 10 + 10,
      featured: item.featured === true,
      url,
      emoji: plainText(typeof item.emoji === "string" ? item.emoji : "", 8),
      schedule
    });
  }
  return { links };
}

function slugKey(raw: string, type: string, index: number) {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  return cleaned || `${type}-${index + 1}`;
}

function readSchedule(value: unknown): { from: string; to: string } | null | { error: string } {
  if (!value || typeof value !== "object") return null;
  const from = typeof (value as { from?: unknown }).from === "string" ? (value as { from: string }).from : "";
  const to = typeof (value as { to?: unknown }).to === "string" ? (value as { to: string }).to : "";
  if (!from && !to) return null;
  if (!CLOCK.test(from) || !CLOCK.test(to)) return { error: "Schedule times use HH:MM" };
  return { from, to };
}

function cleanUrl(type: LinkType, raw: string, enabled: boolean): string | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (!enabled || !linkNeedsUrl(type)) return "";
    return { error: `${type} needs a link` };
  }
  if (type === "call") {
    const tel = trimmed.toLowerCase().startsWith("tel:") ? trimmed : `tel:${trimmed.replace(/[^\d+]/g, "")}`;
    const safe = safeTapUrl(tel, "tel");
    return safe || { error: "Call needs a phone number" };
  }
  if (type === "directions") {
    return safeTapUrl(trimmed, "maps") || { error: "Directions need a Google Maps link" };
  }
  if (type === "upi") {
    return safeTapUrl(trimmed, "upi") || { error: "UPI link must start with upi://pay" };
  }
  if (!linkNeedsUrl(type) && !/^https?:/i.test(trimmed)) {
    if (/javascript:|data:/i.test(trimmed)) return { error: "That link is not allowed" };
    return plainText(trimmed, 200);
  }
  return safeTapUrl(trimmed, "https") || { error: "Use an https link" };
}

/** Fills empty call, map, chat, and Google buttons from the business profile. */
export function fillKnownUrls(links: StoredLink[], contact: KnownContact): StoredLink[] {
  const call = telUrl(contact.phone) || "";
  const maps = directionsUrl([contact.address, contact.city, contact.state, contact.pincode]) || "";
  const chat = whatsAppNumberUrl(contact.whatsappNumber) || "";
  const google = contact.googleReviewUrl ? safeTapUrl(contact.googleReviewUrl, "https") || "" : "";
  return links.map((link) => {
    if (link.url) return link;
    if (link.type === "call" && call) return { ...link, url: call };
    if (link.type === "directions" && maps) return { ...link, url: maps };
    if (link.type === "whatsapp_chat" && chat) return { ...link, url: chat };
    if (link.type === "google" && google) return { ...link, url: google };
    return link;
  });
}

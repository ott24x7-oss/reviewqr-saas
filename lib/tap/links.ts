import { inClockWindow, isOpenAt, WEEK_DAYS, type WeekHours } from "./hours";
import { isLookupCode } from "./ids";
import { orderedReviewTargets } from "../review-policy";
import { safeTapUrl } from "./urls";
import { youtubeThumb } from "./youtube";

export type PublicLink = {
  key: string;
  type: string;
  labelEn: string;
  labelHi: string;
  href: string | null;
  featured: boolean;
  sort: number;
  /** Plain text for wifi, offers, and notes. Empty when the button is only a link. */
  detail?: string;
  thumb?: string | null;
};

export type TapBusinessFields = {
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  cover: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  googleReviewUrl: string | null;
  trustpilotUrl?: string | null;
  reviewPlatform?: string | null;
  reviewGating?: boolean;
  ratingThreshold?: number;
  aiReviewsEnabled?: boolean;
  whatsappNumber: string | null;
  menuCount: number;
  catalogMode?: "MENU" | "SERVICES" | "BOTH";
  serviceCount?: number;
  /** Onboarding category, stored on Business.industry. */
  industry?: string | null;
  published: unknown;
};

const SOCIAL = new Set(["instagram", "facebook", "youtube", "website", "whatsapp_chat"]);

export function menuPath(channel: "q" | "t", code: string) {
  return `/${channel}/${code}/menu`;
}

export function whatsAppNumberUrl(raw: string | null | undefined) {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return `https://wa.me/${digits}`;
}

export function telUrl(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  return safeTapUrl(`tel:${digits}`, "tel");
}

export function directionsUrl(parts: Array<string | null | undefined>) {
  const text = parts.map((part) => (part || "").trim()).filter(Boolean).join(", ");
  if (!text) return null;
  return safeTapUrl(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`, "maps");
}

export function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(raw) && raw.length < 1_500_000) {
    return raw;
  }
  return safeTapUrl(raw, "https");
}

function plain(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
}

/** Links synthesized from the business profile until a snapshot is published. */
export function synthesizeLinks(input: TapBusinessFields & { channel: "q" | "t"; code: string }): PublicLink[] {
  const links: PublicLink[] = [];
  const externalMenu = input.published && typeof input.published === "object"
    ? menuUrlFrom(input.published)
    : null;
  const menuHref = input.menuCount > 0 ? menuPath(input.channel, input.code) : externalMenu;
  if (menuHref) {
    const mode = input.catalogMode || "MENU";
    const menuLabel =
      mode === "SERVICES"
        ? (["Services", "सेवाएँ"] as const)
        : mode === "BOTH"
          ? (["Menu & services", "मेनू और सेवाएँ"] as const)
          : (["View Menu", "मेनू देखें"] as const);
    links.push(link("menu", "menu", menuLabel[0], menuLabel[1], menuHref, true, 10));
    links.push(link("order", "whatsapp_order", "Order on WhatsApp", "WhatsApp पर ऑर्डर", menuHref, true, 20));
    if (mode === "MENU" && (input.serviceCount || 0) > 0) {
      links.push(link("services", "services", "Services", "सेवाएँ", `${menuHref}?view=services`, true, 15));
    }
  }
  links.push(link("feedback", "feedback", "Give Feedback", "प्रतिक्रिया दें", null, true, 30));

  const call = telUrl(input.phone);
  if (call) links.push(link("call", "call", "Call", "कॉल करें", call, false, 40));

  const maps = directionsUrl([input.address, input.city, input.state, input.pincode]);
  if (maps) links.push(link("directions", "directions", "Directions", "दिशा", maps, false, 50));

  const google = input.googleReviewUrl ? safeTapUrl(input.googleReviewUrl, "https") : null;
  if (google && !input.reviewGating) {
    links.push(link("google", "google", "Review on Google", "Google पर रिव्यू", google, false, 60));
  }

  const chat = whatsAppNumberUrl(input.whatsappNumber);
  if (chat) links.push(link("whatsapp", "whatsapp_chat", "WhatsApp", "WhatsApp", chat, false, 70));
  return links;
}

function menuUrlFrom(published: object) {
  const links = (published as { links?: unknown }).links;
  if (!Array.isArray(links)) return null;
  for (const row of links) {
    if (!row || typeof row !== "object") continue;
    const type = (row as { type?: unknown }).type;
    if (type !== "menu") continue;
    const url = (row as { url?: unknown }).url;
    if (typeof url === "string") return safeTapUrl(url, "https");
  }
  return null;
}

function link(
  key: string,
  type: string,
  labelEn: string,
  labelHi: string,
  href: string | null,
  featured: boolean,
  sort: number
): PublicLink {
  return { key, type, labelEn, labelHi, href, featured, sort };
}

function hrefFor(type: string, url: unknown, channel: "q" | "t", code: string, slug: string) {
  if (type === "feedback" || type === "wifi") return null;
  if (type === "vcard") {
    if (isLookupCode(code)) return `/${channel}/${code}/contact`;
    return slug ? `/${slug}/contact` : null;
  }
  if ((type === "menu" || type === "whatsapp_order") && (typeof url !== "string" || !url.trim())) {
    return menuPath(channel, code);
  }
  if (typeof url !== "string") return null;
  if (type === "call") return safeTapUrl(url, "tel");
  if (type === "directions") return safeTapUrl(url, "maps");
  if (type === "upi") return safeTapUrl(url, "upi");
  if (type === "offer" || type === "appointment") return safeTapUrl(url, "https");
  return safeTapUrl(url, "https");
}

/** Published links replace the synthesized set. A missing snapshot keeps the fallback. */
export function resolveLinks(
  published: unknown,
  fallback: PublicLink[],
  channel: "q" | "t",
  code: string,
  now = new Date(),
  slug = ""
): PublicLink[] {
  if (!published || typeof published !== "object" || Array.isArray(published)) return fallback;
  const rows = (published as { links?: unknown }).links;
  if (!Array.isArray(rows)) return fallback;
  const links: PublicLink[] = [];
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const item = row as Record<string, unknown>;
    if (item.enabled === false) return;
    if (!scheduleAllows(item.schedule, now)) return;
    const type = plain(item.type, 40) || "custom";
    const rawUrl = typeof item.url === "string" ? item.url : "";
    const href = hrefFor(type, rawUrl, channel, code, slug);
    const detail = plain(rawUrl, 240);
    const textBlock = type === "wifi" || type === "offer" || type === "appointment" || type === "vcard";
    if (type !== "feedback" && !href && !(textBlock && detail)) return;
    const emoji = plain(item.emoji, 8);
    const labelEn = plain(item.labelEn, 80) || type;
    const labelHi = plain(item.labelHi, 80) || labelEn;
    links.push({
      key: plain(item.key, 40) || `${type}-${index}`,
      type,
      labelEn: emoji ? `${emoji} ${labelEn}` : labelEn,
      labelHi: emoji ? `${emoji} ${labelHi}` : labelHi,
      href,
      featured: item.featured === true,
      sort: typeof item.sort === "number" ? item.sort : index,
      detail: textBlock ? detail : "",
      thumb: type === "youtube" && href ? youtubeThumb(href) : null
    });
  });
  return links.sort((a, b) => a.sort - b.sort);
}

function scheduleAllows(value: unknown, now: Date) {
  if (!value || typeof value !== "object") return true;
  const from = plain((value as { from?: unknown }).from, 5);
  const to = plain((value as { to?: unknown }).to, 5);
  if (!from || !to) return true;
  return inClockWindow(from, to, now);
}

export function hoursFromPublished(published: unknown): WeekHours | null {
  if (!published || typeof published !== "object") return null;
  const hours = (published as { hours?: unknown }).hours;
  if (!hours || typeof hours !== "object") return null;
  const out: WeekHours = {};
  let any = false;
  for (const day of WEEK_DAYS) {
    const row = (hours as Record<string, unknown>)[day];
    if (!row || typeof row !== "object") continue;
    const open = plain((row as { open?: unknown }).open, 5);
    const close = plain((row as { close?: unknown }).close, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(close)) continue;
    out[day] = { open, close };
    any = true;
  }
  return any ? out : null;
}

export function galleryFromPublished(published: unknown) {
  if (!published || typeof published !== "object") return [];
  const gallery = (published as { gallery?: unknown }).gallery;
  if (!Array.isArray(gallery)) return [];
  const urls: string[] = [];
  for (const item of gallery) {
    const src = safeImageSrc(typeof item === "string" ? item : (item as { url?: unknown })?.url);
    if (src) urls.push(src);
    if (urls.length === 8) break;
  }
  return urls;
}

export function splitLinks(links: PublicLink[]) {
  const order = ["menu", "whatsapp_order", "feedback"];
  const primary = order
    .map((type) => links.find((item) => item.type === type))
    .filter((item): item is PublicLink => !!item);
  const used = new Set(primary.map((item) => item.key));
  const rest = links.filter((item) => !used.has(item.key));
  return {
    primary,
    social: rest.filter((item) => SOCIAL.has(item.type)),
    secondary: rest.filter((item) => !SOCIAL.has(item.type))
  };
}

export type PresentedTap = {
  name: string;
  slug: string;
  logo: string | null;
  cover: string | null;
  bio: string;
  bioHi: string;
  open: boolean | null;
  links: PublicLink[];
  gallery: string[];
  call: string | null;
  directions: string | null;
  industry: string | null;
};

/** Keep a click key only when that button is on the page. Anything else is stored as no key. */
export function keepLinkKey(raw: string | null | undefined, allowedKeys: Iterable<string>) {
  const key = (raw || "").trim();
  if (!key) return null;
  for (const allowed of allowedKeys) {
    if (allowed === key) return key;
  }
  return null;
}

/** Keys the public page can emit right now, including gating and schedules. */
export function allowedTapLinkKeys(fields: TapBusinessFields, code: string, now = new Date()) {
  return presentBusiness(fields, "q", code, now).links.map((item) => item.key);
}

/** When gating is on, a published Google or Trustpilot button cannot bypass the rating check. */
export function hideGatedReviewLinks(links: PublicLink[], fields: TapBusinessFields): PublicLink[] {
  if (!fields.reviewGating) return links;
  const blocked = new Set(
    orderedReviewTargets(fields).map((item) => item.href)
  );
  return links.filter((item) => {
    if (item.type === "google") return false;
    if (item.href && blocked.has(item.href)) return false;
    return true;
  });
}

function withServiceButton(links: PublicLink[], fields: TapBusinessFields, channel: "q" | "t", code: string) {
  if ((fields.catalogMode || "MENU") !== "MENU" || !(fields.serviceCount && fields.serviceCount > 0)) return links;
  if (links.some((item) => item.type === "services")) return links;
  return [...links, link("services", "services", "Services", "सेवाएँ", `${menuPath(channel, code)}?view=services`, false, 15)];
}

export function presentBusiness(fields: TapBusinessFields, channel: "q" | "t", code: string, now = new Date()): PresentedTap {
  const published = fields.published;
  const bioPublished = published && typeof published === "object" ? plain((published as { bio?: unknown }).bio, 400) : "";
  const bioHi = published && typeof published === "object" ? plain((published as { bioHi?: unknown }).bioHi, 400) : "";
  const hours = hoursFromPublished(published);
  return {
    name: fields.name,
    slug: fields.slug,
    logo: safeImageSrc(fields.logo),
    cover: safeImageSrc(fields.cover),
    bio: bioPublished || plain(fields.description, 400),
    bioHi,
    open: isOpenAt(hours, now),
    links: withServiceButton(
      hideGatedReviewLinks(
        resolveLinks(published, synthesizeLinks({ ...fields, channel, code }), channel, code, now, fields.slug),
        fields
      ),
      fields,
      channel,
      code
    ),
    gallery: galleryFromPublished(published),
    call: telUrl(fields.phone),
    directions: directionsUrl([fields.address, fields.city, fields.state, fields.pincode]),
    industry: fields.industry ?? null
  };
}


import type { TapLang } from "./i18n";
import type { PublicLink } from "./links";
import { industryKey } from "./presets";

export type LandingFamily = "cafe" | "salon" | "shop";

export type LandingChipId = "dine-in" | "takeaway" | "delivery" | "pickup";

export type FulfillmentFlags = {
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
};

const REVIEW_TYPES = new Set([
  "google",
  "trustpilot",
  "zomato",
  "justdial",
  "swiggy",
  "tripadvisor",
  "practo"
]);

const BOOK_COPY = /book on whatsapp|book appointment|whatsapp पर बुक करें/i;
const FOOD_COPY = /dine-?in|dine in|takeaway|view menu|order on whatsapp|home delivery|मेनू देखें|होम डिलीवरी|यहीं खाएँ|whatsapp पर ऑर्डर/i;
const DINE_COPY = /dine-?in|dine in|यहीं खाएँ/i;

export function landingFamily(industry: string | null | undefined): LandingFamily {
  const key = industryKey(industry);
  if (key === "cafe" || key === "restaurant") return "cafe";
  if (key === "salon" || key === "clinic") return "salon";
  return "shop";
}

/** Status chips only. The dine-in picker stays inside the menu flow. */
export function landingChips(family: LandingFamily, flags: FulfillmentFlags): LandingChipId[] {
  if (family === "salon") return [];
  if (family === "cafe") {
    const chips: LandingChipId[] = [];
    if (flags.dineIn) chips.push("dine-in");
    if (flags.takeaway) chips.push("takeaway");
    if (flags.delivery) chips.push("delivery");
    return chips;
  }
  const chips: LandingChipId[] = [];
  if (flags.takeaway) chips.push("pickup");
  if (flags.delivery) chips.push("delivery");
  return chips;
}

export function chipTextKey(id: LandingChipId): "dineIn" | "takeaway" | "deliveryChip" | "pickup" {
  if (id === "dine-in") return "dineIn";
  if (id === "takeaway") return "takeaway";
  if (id === "pickup") return "pickup";
  return "deliveryChip";
}

export function catalogueKey(family: LandingFamily): "menu" | "services" | "products" {
  if (family === "salon") return "services";
  if (family === "shop") return "products";
  return "menu";
}

/** 21:00 → 9pm, 09:30 → 9:30am, 00:00 → 12am. */
export function clockLabel(hhmm: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  if (minute === 0) return `${hour12}${suffix}`;
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function openUntilLabel(lang: TapLang, hhmm: string | null | undefined): string | null {
  if (!hhmm) return null;
  const time = clockLabel(hhmm);
  if (!time) return null;
  return lang === "hi" ? `${time} तक खुला` : `Open until ${time}`;
}

export function ratingLine(lang: TapLang, average: number, count: number): string | null {
  if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(average)) return null;
  const score = (Math.round(average * 10) / 10).toFixed(1);
  if (lang === "hi") return `${score} · ${count} रिव्यू`;
  return `${score} · ${count} ${count === 1 ? "review" : "reviews"}`;
}

export function countLine(lang: TapLang, family: LandingFamily, serviceCount: number, productCount: number): string | null {
  if (family === "salon") {
    const count = Math.max(0, Math.floor(serviceCount));
    if (count <= 0) return null;
    if (lang === "hi") return count === 1 ? "1 सेवा" : `${count} सेवाएँ`;
    return count === 1 ? "1 service" : `${count} services`;
  }
  if (family === "shop") {
    const count = Math.max(0, Math.floor(productCount));
    if (count <= 0) return null;
    if (lang === "hi") return count === 1 ? "1 प्रोडक्ट" : `${count} प्रोडक्ट`;
    return count === 1 ? "1 product" : `${count} products`;
  }
  return null;
}

export function heroPhotos(cover: string | null | undefined, gallery: string[]): string[] {
  const photos: string[] = [];
  for (const src of [cover, ...gallery]) {
    if (src && !photos.includes(src)) photos.push(src);
  }
  return photos.slice(0, 8);
}

function linkBlob(link: PublicLink) {
  return `${link.labelEn} ${link.labelHi} ${link.detail || ""}`;
}

/** Category pages hide the other category's words. The underlying routes stay. */
export function linkHiddenOnLanding(family: LandingFamily, link: PublicLink): boolean {
  const blob = linkBlob(link);
  if (family === "cafe") {
    if (link.type === "services" || link.type === "appointment") return true;
    return BOOK_COPY.test(blob);
  }
  if (family === "salon") {
    if (link.type === "menu" || link.type === "whatsapp_order" || link.type === "services") return true;
    return FOOD_COPY.test(blob);
  }
  return DINE_COPY.test(blob);
}

/** One salon/clinic action. Reuses the services or menu href that survived the plan lock. */
export function bookAction(links: PublicLink[]): PublicLink | null {
  const source =
    links.find((item) => item.type === "services" && item.href) ||
    links.find((item) => item.type === "menu" && item.href) ||
    links.find((item) => item.type === "appointment" && item.href);
  if (!source?.href) return null;
  return {
    ...source,
    type: "appointment",
    labelEn: "Book on WhatsApp",
    labelHi: "WhatsApp पर बुक करें",
    featured: true
  };
}

export type LandingArrangement = {
  hero: PublicLink[];
  reviews: PublicLink[];
  rest: PublicLink[];
};

export function arrangeLanding(family: LandingFamily, links: PublicLink[]): LandingArrangement {
  const visible = links.filter((item) => !linkHiddenOnLanding(family, item));
  const used = new Set<string>();
  const hero: PublicLink[] = [];

  if (family === "salon") {
    const book = bookAction(links);
    if (book) {
      hero.push(book);
      used.add(book.key);
    }
  } else if (family === "cafe") {
    for (const type of ["menu", "whatsapp_order"] as const) {
      const item = visible.find((link) => link.type === type);
      if (!item) continue;
      hero.push(item);
      used.add(item.key);
    }
  } else {
    const order = visible.find((link) => link.type === "whatsapp_order");
    if (order) {
      hero.push(order);
      used.add(order.key);
    }
  }

  const reviews: PublicLink[] = [];
  const rest: PublicLink[] = [];
  for (const item of visible) {
    if (used.has(item.key) || item.type === "feedback") continue;
    if (REVIEW_TYPES.has(item.type)) reviews.push(item);
    else rest.push(item);
  }
  return { hero, reviews, rest };
}

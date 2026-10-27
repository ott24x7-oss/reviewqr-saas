import { describe, expect, it } from "vitest";
import {
  arrangeLanding,
  bookAction,
  clockLabel,
  countLine,
  heroPhotos,
  landingChips,
  landingFamily,
  linkHiddenOnLanding,
  openUntilLabel,
  ratingLine,
  type LandingFamily
} from "../../lib/tap/landing";
import type { PublicLink } from "../../lib/tap/links";

function link(partial: Partial<PublicLink> & Pick<PublicLink, "key" | "type" | "labelEn">): PublicLink {
  return {
    labelHi: partial.labelHi || partial.labelEn,
    href: partial.href === undefined ? "https://example.com" : partial.href,
    featured: partial.featured ?? false,
    sort: partial.sort ?? 0,
    ...partial
  };
}

const sample: PublicLink[] = [
  link({ key: "menu", type: "menu", labelEn: "View Menu", labelHi: "मेनू देखें", href: "/q/demo/menu", sort: 10 }),
  link({ key: "services", type: "services", labelEn: "Services", labelHi: "सेवाएँ", href: "/q/demo/menu?view=services", sort: 15 }),
  link({ key: "order", type: "whatsapp_order", labelEn: "Order on WhatsApp", labelHi: "WhatsApp पर ऑर्डर", href: "/q/demo/menu", sort: 20 }),
  link({ key: "book", type: "appointment", labelEn: "Book appointment", labelHi: "अपॉइंटमेंट", href: "https://example.com/book", sort: 25 }),
  link({ key: "feedback", type: "feedback", labelEn: "Give Feedback", labelHi: "प्रतिक्रिया दें", href: null, sort: 30 }),
  link({ key: "dine", type: "website", labelEn: "Dine-in specials", labelHi: "यहीं खाएँ", href: "https://example.com/dine", sort: 35 }),
  link({ key: "google", type: "google", labelEn: "Review on Google", labelHi: "Google पर रिव्यू", href: "https://example.com/review", sort: 60 }),
  link({ key: "chat", type: "whatsapp_chat", labelEn: "WhatsApp", labelHi: "WhatsApp", href: "https://wa.me/9198", sort: 70 })
];

describe("landing family", () => {
  it("collapses onboarding categories into three heroes", () => {
    expect(landingFamily("cafe")).toBe("cafe");
    expect(landingFamily("Café / restaurant")).toBe("cafe");
    expect(landingFamily("neighbourhood restaurant")).toBe("cafe");
    expect(landingFamily("salon")).toBe("salon");
    expect(landingFamily("clinic")).toBe("salon");
    expect(landingFamily("shop")).toBe("shop");
    expect(landingFamily("other")).toBe("shop");
    expect(landingFamily(null)).toBe("shop");
  });
});

describe("landing chips", () => {
  const flags = { dineIn: true, takeaway: true, delivery: true };

  it("keeps food facilities off salon and dine-in off shop", () => {
    expect(landingChips("cafe", flags)).toEqual(["dine-in", "takeaway", "delivery"]);
    expect(landingChips("salon", flags)).toEqual([]);
    expect(landingChips("shop", flags)).toEqual(["pickup", "delivery"]);
    expect(landingChips("shop", { dineIn: true, takeaway: false, delivery: false })).toEqual([]);
  });
});

describe("landing clock and counts", () => {
  it("formats closing times without a leading zero", () => {
    expect(clockLabel("21:00")).toBe("9pm");
    expect(clockLabel("09:30")).toBe("9:30am");
    expect(clockLabel("00:00")).toBe("12am");
    expect(clockLabel("12:00")).toBe("12pm");
    expect(clockLabel("23:59")).toBe("11:59pm");
    expect(clockLabel("25:00")).toBeNull();
    expect(openUntilLabel("en", "21:00")).toBe("Open until 9pm");
    expect(openUntilLabel("hi", "21:00")).toBe("9pm तक खुला");
    expect(openUntilLabel("en", null)).toBeNull();
  });

  it("omits an empty rating and keeps one decimal", () => {
    expect(ratingLine("en", 0, 0)).toBeNull();
    expect(ratingLine("en", 5, 1)).toBe("5.0 · 1 review");
    expect(ratingLine("en", 4.666, 24)).toBe("4.7 · 24 reviews");
    expect(ratingLine("hi", 5, 2)).toBe("5.0 · 2 रिव्यू");
  });

  it("counts services for salon and products for shop", () => {
    expect(countLine("en", "cafe", 4, 9)).toBeNull();
    expect(countLine("en", "salon", 1, 0)).toBe("1 service");
    expect(countLine("en", "salon", 12, 3)).toBe("12 services");
    expect(countLine("hi", "salon", 2, 0)).toBe("2 सेवाएँ");
    expect(countLine("en", "shop", 4, 1)).toBe("1 product");
    expect(countLine("en", "shop", 0, 0)).toBeNull();
  });
});

describe("landing links", () => {
  it.each(["cafe", "salon", "shop"] as LandingFamily[])("keeps feedback, reviews, and WhatsApp chat on %s", (family) => {
    const arranged = arrangeLanding(family, sample);
    const shown = [...arranged.hero, ...arranged.reviews, ...arranged.rest].map((item) => item.key);
    expect(shown).not.toContain("feedback");
    expect(arranged.reviews.map((item) => item.key)).toContain("google");
    expect(arranged.rest.map((item) => item.key)).toContain("chat");
  });

  it("hides service booking on a cafe and food copy on a salon", () => {
    const cafe = arrangeLanding("cafe", sample);
    const cafeText = [...cafe.hero, ...cafe.reviews, ...cafe.rest].map((item) => `${item.labelEn} ${item.type}`).join(" ");
    expect(cafeText).not.toMatch(/Book on WhatsApp|Book appointment|services/i);
    expect(cafe.hero.map((item) => item.type)).toEqual(["menu", "whatsapp_order"]);

    const salon = arrangeLanding("salon", sample);
    const salonText = [...salon.hero, ...salon.reviews, ...salon.rest].map((item) => `${item.labelEn} ${item.labelHi}`).join("\n");
    expect(salon.hero.map((item) => item.labelEn)).toEqual(["Book on WhatsApp"]);
    expect(salon.hero[0]?.href).toBe("/q/demo/menu?view=services");
    expect(salonText).not.toMatch(/dine-?in|Dine-in|Takeaway|View Menu|Order on WhatsApp|मेनू देखें/i);

    const shop = arrangeLanding("shop", sample);
    expect(shop.hero.map((item) => item.labelEn)).toEqual(["Order on WhatsApp"]);
    expect(shop.rest.map((item) => item.key)).toContain("menu");
    expect([...shop.hero, ...shop.reviews, ...shop.rest].map((item) => item.key)).not.toContain("dine");
  });

  it("drops the book action when the catalogue link was plan-locked", () => {
    expect(bookAction([link({ key: "feedback", type: "feedback", labelEn: "Give Feedback", href: null })])).toBeNull();
    expect(linkHiddenOnLanding("shop", link({ key: "dine", type: "note", labelEn: "Dine in", labelHi: "यहीं खाएँ" }))).toBe(true);
  });

  it("puts the cover first and skips duplicates", () => {
    expect(heroPhotos("https://cdn.example/a.jpg", ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"])).toEqual([
      "https://cdn.example/a.jpg",
      "https://cdn.example/b.jpg"
    ]);
    expect(heroPhotos(null, [])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { CAFE_TEMPLATE } from "../../lib/tap/cafe-template";
import { presentBusiness, type TapBusinessFields } from "../../lib/tap/links";
import { fillKnownUrls, normalizeLinks } from "../../lib/tap/page-draft";
import { CODE_PRESETS, industryKey } from "../../lib/tap/presets";

const cafe: TapBusinessFields = {
  name: "Smoke Cafe",
  slug: "smoke-cafe",
  description: "",
  logo: null,
  cover: null,
  phone: "9876543210",
  address: "12 MG Road",
  city: "Bengaluru",
  state: null,
  pincode: null,
  googleReviewUrl: null,
  whatsappNumber: null,
  menuCount: 0,
  published: null
};

describe("café template", () => {
  it("starts with coffee, tea, snacks, and desserts", () => {
    expect(CAFE_TEMPLATE.map((group) => group.category)).toEqual(["Coffee", "Tea", "Snacks", "Desserts"]);
    expect(CAFE_TEMPLATE[0].items[0].pricePaise).toBe(12000);
  });
});

describe("industry presets", () => {
  it("maps a café category onto the café button set", () => {
    expect(industryKey("Café")).toBe("cafe");
    expect(industryKey("neighbourhood clinic")).toBe("clinic");
    expect(industryKey("")).toBe("other");
    expect(CODE_PRESETS.cafe.map((link) => link.type)).toContain("feedback");
  });

  it("fills an empty call button from the business phone", () => {
    const [call] = fillKnownUrls(
      [{ ...CODE_PRESETS.cafe[3], url: "" }],
      { phone: "9876543210" }
    );
    expect(call.url).toBe("tel:9876543210");
  });
});

describe("tap page draft", () => {
  it("rejects a javascript link and accepts feedback without a url", () => {
    expect(normalizeLinks([{ type: "custom", labelEn: "Bad", url: "javascript:alert(1)", enabled: true }])).toEqual({
      error: "Use an https link"
    });
    const feedback = normalizeLinks([{ type: "feedback", labelEn: "Give Feedback", labelHi: "प्रतिक्रिया दें", enabled: true }]);
    expect("links" in feedback && feedback.links[0].url).toBe("");
  });

  it("hides a button outside its India time window and keeps an overnight window", () => {
    const published = {
      links: [
        {
          key: "lunch",
          type: "offer",
          labelEn: "Lunch",
          labelHi: "लंच",
          enabled: true,
          url: "https://example.com/lunch",
          schedule: { from: "12:00", to: "15:00" }
        },
        {
          key: "late",
          type: "custom",
          labelEn: "Late",
          labelHi: "देर",
          enabled: true,
          url: "https://example.com/late",
          schedule: { from: "22:00", to: "02:00" }
        }
      ]
    };
    const noon = presentBusiness({ ...cafe, published }, "q", "DEMO", new Date("2026-10-21T12:30:00+05:30"));
    expect(noon.links.map((link) => link.key)).toEqual(["lunch"]);
    const night = presentBusiness({ ...cafe, published }, "q", "DEMO", new Date("2026-10-21T23:15:00+05:30"));
    expect(night.links.map((link) => link.key)).toEqual(["late"]);
    const morning = presentBusiness({ ...cafe, published }, "q", "DEMO", new Date("2026-10-21T09:00:00+05:30"));
    expect(morning.links).toEqual([]);
  });
});

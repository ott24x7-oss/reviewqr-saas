import { describe, expect, it } from "vitest";
import { canonicalRedirect } from "../../lib/http/canonical";
import { presentBusiness, synthesizeLinks, type TapBusinessFields } from "../../lib/tap/links";
import { scanSource } from "../../lib/tap/source";

const cafe: TapBusinessFields = {
  name: "Smoke Cafe",
  slug: "smoke-cafe",
  description: "Tea and snacks",
  logo: null,
  cover: null,
  phone: "9876543210",
  address: "12 MG Road",
  city: "Bengaluru",
  state: null,
  pincode: null,
  googleReviewUrl: "https://search.google.com/local/writereview?placeid=abc",
  whatsappNumber: "+91 98765 43210",
  menuCount: 0,
  published: null
};

describe("canonical host redirect", () => {
  const appUrl = "https://reviewqr.in";

  it("skips the health check on the public host", () => {
    expect(
      canonicalRedirect({
        pathname: "/api/health",
        search: "",
        host: "reviewqr.in",
        proto: "http",
        appUrl
      })
    ).toBeNull();
  });

  it("skips Railway and any host that is not the public host", () => {
    expect(
      canonicalRedirect({
        pathname: "/api/health",
        search: "",
        host: "healthcheck.railway.app",
        proto: "http",
        appUrl
      })
    ).toBeNull();
    expect(
      canonicalRedirect({
        pathname: "/q/DEMO",
        search: "",
        host: "healthcheck.railway.app",
        proto: "http",
        appUrl
      })
    ).toBeNull();
    expect(
      canonicalRedirect({
        pathname: "/login",
        search: "",
        host: "localhost:3000",
        proto: "http",
        appUrl
      })
    ).toBeNull();
  });

  it("redirects http and www on the public host to the configured origin", () => {
    expect(
      canonicalRedirect({
        pathname: "/q/DEMO",
        search: "?src=qr",
        host: "reviewqr.in",
        proto: "http",
        appUrl
      })
    ).toBe("https://reviewqr.in/q/DEMO?src=qr");
    expect(
      canonicalRedirect({
        pathname: "/",
        search: "",
        host: "www.reviewqr.in",
        proto: "https",
        appUrl
      })
    ).toBe("https://reviewqr.in/");
  });

  it("leaves an already canonical https request alone", () => {
    expect(
      canonicalRedirect({
        pathname: "/q/DEMO",
        search: "",
        host: "reviewqr.in",
        proto: "https",
        appUrl
      })
    ).toBeNull();
  });
});

describe("default tap links", () => {
  it("hides menu buttons until a menu exists and always offers feedback", () => {
    const links = synthesizeLinks({ ...cafe, channel: "q", code: "DEMO" });
    expect(links.map((link) => link.type)).toEqual(["feedback", "call", "directions", "google", "whatsapp_chat"]);
    expect(links.find((link) => link.type === "call")?.href).toBe("tel:9876543210");
    expect(links.find((link) => link.type === "whatsapp_chat")?.href).toBe("https://wa.me/919876543210");
  });

  it("adds menu and order once items exist", () => {
    const view = presentBusiness({ ...cafe, menuCount: 2 }, "t", "DEMO");
    const types = view.links.map((link) => link.type);
    expect(types.slice(0, 2)).toEqual(["menu", "whatsapp_order"]);
    expect(view.links[0].href).toBe("/t/DEMO/menu");
    expect(view.links[0].labelEn).toBe("View Menu");
  });

  it("relabels the menu button and adds Services when the catalogue says so", () => {
    const services = presentBusiness({ ...cafe, menuCount: 2, catalogMode: "SERVICES" }, "q", "DEMO");
    expect(services.links[0].labelEn).toBe("Services");
    expect(services.links[0].labelHi).toBe("सेवाएँ");
    const both = presentBusiness({ ...cafe, menuCount: 2, catalogMode: "BOTH" }, "q", "DEMO");
    expect(both.links[0].labelEn).toBe("Menu & services");
    const extra = synthesizeLinks({ ...cafe, channel: "q", code: "DEMO", menuCount: 2, serviceCount: 1 });
    expect(extra.find((link) => link.type === "services")?.href).toBe("/q/DEMO/menu?view=services");
    expect(extra[0].labelEn).toBe("View Menu");
  });

  it("uses a published snapshot instead of the synthesized buttons", () => {
    const view = presentBusiness(
      {
        ...cafe,
        published: {
          bio: "Published bio",
          links: [{ key: "feedback", type: "feedback", labelEn: "Give Feedback", labelHi: "प्रतिक्रिया दें", enabled: true, sort: 1 }]
        }
      },
      "q",
      "DEMO"
    );
    expect(view.bio).toBe("Published bio");
    expect(view.links.map((link) => link.type)).toEqual(["feedback"]);
  });
});

describe("scan source", () => {
  it("counts a bare /q visit as qr and a bare /t visit as nfc", () => {
    expect(scanSource("q", undefined)).toBe("qr");
    expect(scanSource("t", null)).toBe("nfc");
    expect(scanSource("q", "nfc")).toBe("nfc");
    expect(scanSource("t", "link")).toBe("link");
  });
});

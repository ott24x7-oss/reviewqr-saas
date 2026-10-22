import { describe, expect, it } from "vitest";
import { describeOpen, resolveDirect, type DirectChoiceLink } from "../../lib/tap/direct";
import { destinationFor } from "../../lib/tap/direct-http";

const google: DirectChoiceLink = {
  key: "google",
  type: "google",
  href: "https://reviews.example.test/write",
  labelEn: "Google review",
  labelHi: "Google रिव्यू",
  enabled: true
};

const menu: DirectChoiceLink = {
  key: "menu",
  type: "menu",
  href: "/q/TABLE/menu",
  labelEn: "Menu",
  labelHi: "मेनू",
  enabled: true
};

const hosts = ["reviewqr.example"];

function decide(overrides: Partial<Parameters<typeof resolveDirect>[0]> = {}) {
  return resolveDirect({
    pagePreview: false,
    limited: false,
    deviceMode: "INHERIT",
    deviceTarget: "",
    businessMode: "DIRECT",
    businessTarget: "google",
    links: [google, menu],
    modules: ["REVIEWS", "MENU", "STORE"],
    ownHosts: hosts,
    ...overrides
  });
}

describe("direct link resolution", () => {
  it("uses the device override, then the business, then the tap page", () => {
    expect(decide().action).toBe("redirect");
    expect(decide({ deviceMode: "DIRECT", deviceTarget: "menu" })).toEqual({
      action: "redirect",
      href: "/q/TABLE/menu",
      targetType: "menu"
    });
    expect(decide({ deviceMode: "TAP_PAGE", deviceTarget: "menu" })).toEqual({ action: "page" });
    expect(decide({ businessMode: "TAP_PAGE", businessTarget: "" })).toEqual({ action: "page" });
  });

  it("falls back when the button is disabled, the URL is unsafe, or the plan is expired", () => {
    expect(decide({ links: [{ ...google, enabled: false }] })).toEqual({ action: "page" });
    expect(decide({ links: [{ ...google, href: "javascript:alert(1)" }] })).toEqual({ action: "page" });
    expect(decide({ links: [{ ...google, href: "data:text/html,hi" }] })).toEqual({ action: "page" });
    expect(decide({ links: [{ ...google, href: "https://reviewqr.example/q/OTHER" }] })).toEqual({ action: "page" });
    expect(decide({ limited: true })).toEqual({ action: "page" });
    expect(decide({ businessTarget: "menu", modules: ["REVIEWS"] })).toEqual({ action: "page" });
    expect(decide({ businessTarget: "missing" })).toEqual({ action: "page" });
  });

  it("opens Google for every customer when the button is on, and ?page=1 keeps the page", () => {
    const open = decide();
    expect(open).toEqual({ action: "redirect", href: "https://reviews.example.test/write", targetType: "google" });
    expect(decide({ pagePreview: true })).toEqual({ action: "page" });
    expect(destinationFor("https://reviews.example.test/write", hosts)).toBe("https://reviews.example.test/write");
  });

  it("names the effective open target for the device badge", () => {
    expect(describeOpen({
      limited: false,
      deviceMode: "DIRECT",
      deviceTarget: "menu",
      businessMode: "DIRECT",
      businessTarget: "google",
      links: [google, menu],
      modules: ["REVIEWS", "MENU", "STORE"]
    }).labelEn).toBe("Menu");
    expect(describeOpen({
      limited: false,
      deviceMode: "INHERIT",
      deviceTarget: "",
      businessMode: "TAP_PAGE",
      businessTarget: "",
      links: [google],
      modules: ["REVIEWS"]
    }).labelEn).toBe("Tap page");
  });
});

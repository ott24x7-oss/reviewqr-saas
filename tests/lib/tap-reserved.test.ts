import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { isReservedSlug, reservedFromAppDir } from "../../lib/tap/reserved-slugs";
import { youtubeThumb } from "../../lib/tap/youtube";
import { buildVCard } from "../../lib/tap/vcard";
import { parseMenuDraft } from "../../lib/tap/menu-draft";
import { presentBusiness, type TapBusinessFields } from "../../lib/tap/links";

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
  pincode: "560001",
  googleReviewUrl: null,
  whatsappNumber: null,
  menuCount: 0,
  published: null
};

describe("reserved business slugs", () => {
  it("reserves real folders and the fixed list, and ignores route groups", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rq-app-"));
    fs.mkdirSync(path.join(root, "about"));
    fs.mkdirSync(path.join(root, "(marketing)"));
    fs.mkdirSync(path.join(root, "_draft"));
    fs.mkdirSync(path.join(root, "demo"));
    const reserved = reservedFromAppDir(root);
    expect(reserved.has("about")).toBe(true);
    expect(reserved.has("demo")).toBe(true);
    expect(reserved.has("login")).toBe(true);
    expect(reserved.has("(marketing)")).toBe(false);
    expect(reserved.has("_draft")).toBe(false);
    expect(isReservedSlug("demo-cafe", root)).toBe(false);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("reads the real app directory", () => {
    const reserved = reservedFromAppDir(path.join(process.cwd(), "app"));
    expect(reserved.has("demo")).toBe(true);
    expect(reserved.has("q")).toBe(true);
    expect(reserved.has("login")).toBe(true);
    expect(reserved.has("(auth)")).toBe(false);
    expect(reserved.has("(dashboard)")).toBe(false);
    expect(isReservedSlug("demo-cafe")).toBe(false);
  });
});

describe("public tap blocks", () => {
  it("keeps wifi text, a UPI link, a YouTube thumbnail, and a contact card", () => {
    const view = presentBusiness(
      {
        ...cafe,
        published: {
          links: [
            { key: "wifi", type: "wifi", labelEn: "Wi-Fi", labelHi: "वाई-फाई", enabled: true, sort: 1, url: "SpiceGuest / coffee" },
            { key: "upi", type: "upi", labelEn: "Pay", labelHi: "भुगतान", enabled: true, sort: 2, url: "upi://pay?pa=cafe@upi&cu=INR" },
            { key: "yt", type: "youtube", labelEn: "Film", labelHi: "फ़िल्म", enabled: true, sort: 3, url: "https://youtu.be/aqz-KE-bpKQ" },
            { key: "card", type: "vcard", labelEn: "Save contact", labelHi: "संपर्क", enabled: true, sort: 4, url: "" },
            { key: "bad", type: "custom", labelEn: "Bad", labelHi: "Bad", enabled: true, sort: 5, url: "javascript:alert(1)" }
          ],
          gallery: ["https://cdn.example.com/plate.jpg", "javascript:alert(1)"]
        }
      },
      "q",
      "DEMO"
    );
    expect(view.links.find((link) => link.type === "wifi")?.detail).toBe("SpiceGuest / coffee");
    expect(view.links.find((link) => link.type === "wifi")?.href).toBeNull();
    expect(view.links.find((link) => link.type === "upi")?.href).toBe("upi://pay?pa=cafe@upi&cu=INR");
    expect(view.links.find((link) => link.type === "youtube")?.thumb).toBe("https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg");
    expect(view.links.find((link) => link.type === "vcard")?.href).toBe("/q/DEMO/contact");
    expect(view.links.find((link) => link.type === "custom")).toBeUndefined();
    expect(view.gallery).toEqual(["https://cdn.example.com/plate.jpg"]);
    expect(youtubeThumb("https://www.youtube.com/watch?v=aqz-KE-bpKQ")).toBe(
      "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg"
    );
    expect(youtubeThumb("https://example.com/watch?v=aqz-KE-bpKQ")).toBeNull();
  });
});

describe("contact card and menu photo text", () => {
  it("escapes vCard punctuation", () => {
    const card = buildVCard({ name: "Spice, Junction", phone: "+91 98765 43210", note: "Line\nTwo" });
    expect(card).toContain("FN:Spice\\, Junction");
    expect(card).toContain("TEL;TYPE=CELL:+919876543210");
    expect(card).toContain("NOTE:Line Two");
    expect(card.startsWith("BEGIN:VCARD")).toBe(true);
  });

  it("reads dishes from a model reply and drops junk", () => {
    const items = parseMenuDraft(
      'Sure. {"items":[{"name":"Filter coffee","priceRupees":80,"veg":"VEG"},{"name":"","price":10},{"name":"Chicken","price":"₹220","veg":"non-veg"}]}'
    );
    expect(items).toEqual([
      { name: "Filter coffee", priceRupees: 80, veg: "VEG" },
      { name: "Chicken", priceRupees: 220, veg: "NON_VEG" }
    ]);
    expect(parseMenuDraft("no json here")).toEqual([]);
  });
});

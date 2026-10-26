import { FEATURES } from "@reviewqr/shared";
import { describe, expect, it } from "vitest";
import { parseBullets, resolveBullets } from "../../lib/plans/bullets";
import { DEFAULT_PRICING_FAQS, DEFAULT_STICKER_ROWS, pricingCopyFromUnknown } from "../../lib/plans/pricing-copy";

describe("plan bullets", () => {
  it("builds comparison lines from modules when a plan has no bullets", () => {
    const bullets = resolveBullets([], ["MENU"]);
    expect(bullets.every((bullet) => bullet.compare)).toBe(true);
    expect(bullets.map((bullet) => bullet.en)).toEqual(
      FEATURES.filter((feature) => feature.module === "MENU").map((feature) => feature.labelEn)
    );
  });

  it("keeps written bullets, including ones hidden from the comparison", () => {
    const written = [{ en: "Counter QR", hi: "काउंटर QR", compare: false }];
    expect(resolveBullets(written, ["REVIEWS", "MENU"])).toEqual(written);
  });

  it("drops blank rows", () => {
    expect(parseBullets([{ en: "  ", hi: "हाय", compare: true }, { en: "Ok", hi: "ठीक", compare: true }, null])).toEqual([
      { en: "Ok", hi: "ठीक", compare: true }
    ]);
  });
});

describe("pricing page copy", () => {
  it("keeps today's questions when nothing is stored", () => {
    const copy = pricingCopyFromUnknown(null);
    expect(copy.faqs.map((item) => item.qEn)).toEqual(DEFAULT_PRICING_FAQS.map((item) => item.qEn));
    expect(copy.faqs.every((item) => item.qHi.length > 0 && item.aHi.length > 0)).toBe(true);
    expect(copy.stickerRows.map((row) => row.labelEn)).toEqual(DEFAULT_STICKER_ROWS.map((row) => row.labelEn));
    expect(copy.faqs.some((item) => item.qEn === "What is NFC? Do my customers need an app?")).toBe(true);
    expect(copy.faqs.some((item) => item.qEn === "Can I pick a different duration?")).toBe(true);
  });

  it("uses a saved list and ignores a broken one", () => {
    const saved = {
      faqs: [{ qEn: "Custom?", qHi: "कस्टम?", aEn: "Yes.", aHi: "हाँ।" }],
      stickerRows: [{ labelEn: "Tap", labelHi: "टैप", sticker: false, qr24x7: true }]
    };
    expect(pricingCopyFromUnknown(saved)).toEqual(saved);
    expect(pricingCopyFromUnknown({ faqs: [] }).faqs.map((item) => item.qEn)).toEqual(
      DEFAULT_PRICING_FAQS.map((item) => item.qEn)
    );
  });
});

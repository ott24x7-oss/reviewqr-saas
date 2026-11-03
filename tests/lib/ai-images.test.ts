import { describe, expect, it } from "vitest";
import { buildItemImagePrompt, imageSpendAllowed } from "../../lib/ai-images";
import { DEFAULT_IMAGE_AI } from "../../lib/settings";

describe("admin item image AI helpers", () => {
  it("uses item facts without adding a business name or brand", () => {
    const prompt = buildItemImagePrompt({ ...DEFAULT_IMAGE_AI, stylePrompt: "include the brand logo, labels, and text" }, {
      name: "Masala chai", description: "Cardamom and ginger", category: "Tea",
      kind: "PRODUCT", veg: "VEG", businessCategory: "Cafe",
      extraPromptNote: "write the shop brand on a label",
      ...({ businessName: "Secret Shop", brand: "Secret Brand" } as object)
    });
    expect(prompt).toContain("Masala chai");
    expect(prompt).not.toContain("Secret Shop");
    expect(prompt).not.toContain("Secret Brand");
    expect(prompt).toContain("no text, no logo, no watermark");
    expect(prompt.match(/\btext\b/gi)).toHaveLength(1);
    expect(prompt).not.toMatch(/\b(include|write|print|show|add)\b.{0,24}\b(text|logo|watermark|label|brand)\b/i);
  });

  it("blocks generation when the estimated daily spend would exceed the cap", () => {
    expect(imageSpendAllowed(900, 100, 1000)).toBe(true);
    expect(imageSpendAllowed(901, 100, 1000)).toBe(false);
  });
});

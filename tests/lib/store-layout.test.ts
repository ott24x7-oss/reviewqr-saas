import { describe, expect, it } from "vitest";
import { askOnWhatsApp, layoutFromIndustry, resolveLayout } from "../../lib/store/layout";

describe("store layout", () => {
  it("maps food, services, and everything else", () => {
    expect(layoutFromIndustry("Café · Restaurant")).toBe("FOOD");
    expect(layoutFromIndustry("bakery")).toBe("FOOD");
    expect(layoutFromIndustry("salon")).toBe("SERVICES");
    expect(layoutFromIndustry("gym")).toBe("SERVICES");
    expect(layoutFromIndustry("mobile shop")).toBe("SHOP");
    expect(layoutFromIndustry("kirana")).toBe("SHOP");
    expect(layoutFromIndustry("")).toBe("SHOP");
  });

  it("lets the owner override the industry", () => {
    expect(resolveLayout("FOOD", "clothing")).toBe("FOOD");
    expect(resolveLayout("AUTO", "clinic")).toBe("SERVICES");
    expect(resolveLayout(null, "shop")).toBe("SHOP");
  });

  it("builds an ask link without dropping the number", () => {
    expect(askOnWhatsApp("https://wa.me/919876543210", "Blue shirt")).toBe(
      "https://wa.me/919876543210?text=Hi%2C+I+want+to+ask+about+Blue+shirt"
    );
    expect(askOnWhatsApp("", "Blue shirt")).toBe("");
  });
});

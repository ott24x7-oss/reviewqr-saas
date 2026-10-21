import { describe, expect, it } from "vitest";
import { adjustedPricePaise, lineUnitPaise, matchVariant, optionLineName, resolveChoice, usesSizeColour } from "../../lib/store/variants";

const half = { id: "h", label: "Half", size: "", colour: "", pricePaise: 8000, inStock: true };
const full = { id: "f", label: "Full", size: "", colour: "", pricePaise: 14000, inStock: false };
const redM = { id: "rm", label: "M / Red", size: "M", colour: "Red", pricePaise: 49900, inStock: true };
const blueM = { id: "bm", label: "M / Blue", size: "M", colour: "Blue", pricePaise: 49900, inStock: false };

describe("menu variants", () => {
  it("prices a line from the variant plus add-ons", () => {
    expect(lineUnitPaise(10000, half, [{ pricePaise: 2000 }])).toBe(10000);
    expect(lineUnitPaise(10000, null, [{ pricePaise: 1500 }, { pricePaise: 500 }])).toBe(12000);
  });

  it("uses one label list for food and a size/colour pair for shop items", () => {
    expect(usesSizeColour([half, full])).toBe(false);
    expect(usesSizeColour([redM, blueM])).toBe(true);
    expect(matchVariant([redM, blueM], "M", "Blue")?.id).toBe("bm");
    expect(matchVariant([redM, blueM], "S", "Red")).toBeNull();
  });

  it("adjusts prices by percent or rupees and never goes below zero", () => {
    expect(adjustedPricePaise(10000, "percent", 10)).toBe(11000);
    expect(adjustedPricePaise(10000, "rupees", -20)).toBe(8000);
    expect(adjustedPricePaise(500, "rupees", -20)).toBe(0);
  });

  it("rejects a missing, unknown, or out-of-stock choice and prices a valid one", () => {
    const extra = { id: "e", name: "Extra cheese", pricePaise: 2000, inStock: true };
    const soldOut = { id: "s", name: "Sauce", pricePaise: 500, inStock: false };
    expect(resolveChoice({ itemPricePaise: 10000, variants: [half, full], addOns: [], variantId: "" }).ok).toBe(false);
    expect(resolveChoice({ itemPricePaise: 10000, variants: [half], addOns: [], variantId: "missing" })).toEqual({ ok: false, code: "missing" });
    expect(resolveChoice({ itemPricePaise: 10000, variants: [full], addOns: [], variantId: "f" })).toEqual({ ok: false, code: "stock" });
    expect(resolveChoice({ itemPricePaise: 10000, variants: [], addOns: [extra], variantId: "nope" })).toEqual({ ok: false, code: "missing" });
    expect(resolveChoice({ itemPricePaise: 10000, variants: [half], addOns: [soldOut], variantId: "h", addonIds: ["s"] })).toEqual({ ok: false, code: "stock" });
    const priced = resolveChoice({ itemPricePaise: 10000, variants: [half], addOns: [extra, soldOut], variantId: "h", addonIds: ["e", "e"] });
    expect(priced).toMatchObject({ ok: true, unitPaise: 10000 });
    expect(optionLineName("Pizza", "Half", ["Extra cheese"])).toBe("Pizza (Half) + Extra cheese");
    expect(optionLineName("Pizza", "", [])).toBe("Pizza");
  });
});

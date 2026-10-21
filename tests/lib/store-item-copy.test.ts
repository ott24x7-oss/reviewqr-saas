import { describe, expect, it } from "vitest";
import { readItemCopy } from "../../lib/store/item-copy";

describe("item copy", () => {
  it("reads a short description and ignores a price in the same object", () => {
    const text = readItemCopy('{"description":"Crispy dosa with potato masala","price":120}', "description");
    expect(text).toBe("Crispy dosa with potato masala");
  });

  it("reads a Hindi name from a reply that has extra prose", () => {
    const text = readItemCopy('Here you go {"nameHi":"मसाला डोसा"} thanks', "nameHi");
    expect(text).toBe("मसाला डोसा");
  });

  it("rejects an empty suggestion so the field can stay as it was", () => {
    expect(() => readItemCopy('{"description":" "}', "description")).toThrow(/usable/);
    expect(() => readItemCopy("not json", "nameHi")).toThrow(/usable/);
  });

  it("caps a description at 200 characters", () => {
    const long = "a".repeat(240);
    expect(readItemCopy(JSON.stringify({ description: long }), "description")).toHaveLength(200);
  });
});

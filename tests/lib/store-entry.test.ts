import { describe, expect, it } from "vitest";
import { parseMenuDraft } from "../../lib/tap/menu-draft";
import {
  parseCsv,
  readProductDraft,
  rowError,
  splitPastedItems,
  takeForSave,
  templateCsv
} from "../../lib/store/entry";
import { STORE_TEMPLATES } from "../../lib/store/templates";

describe("fast product entry", () => {
  it("splits obvious name and price lines without a model", () => {
    const rows = splitPastedItems("Cappuccino 120, Latte 140");
    expect(rows.map((row) => [row.name, row.price])).toEqual([
      ["Cappuccino", "120"],
      ["Latte", "140"]
    ]);
    expect(splitPastedItems("please send the menu")).toEqual([]);
  });

  it("marks csv rows that cannot be saved", () => {
    const rows = parseCsv(
      [
        "name,price,category,Hindi name,description,veg,brand,MRP",
        "Filter coffee,80,Coffee,फ़िल्टर,South Indian,VEG,,",
        ",20,Snacks,,,VEG,,",
        "Tea,abc,Tea,,,VEG,,",
        "Samosa,30,Snacks,,,spicy,,"
      ].join("\n")
    );
    expect(rowError(rows[0])).toBe("");
    expect(rowError(rows[1])).toBe("Missing name");
    expect(rowError(rows[2])).toBe("Price is not a number");
    expect(rowError(rows[3])).toBe("Veg mark must be VEG, NON_VEG, EGG, or NONE");
    expect(parseCsv(templateCsv()).every((row) => rowError(row) === "")).toBe(true);
  });

  it("keeps quoted commas inside the name", () => {
    const rows = parseCsv('name,price\n"Paneer, butter",180\n');
    expect(rows[0].name).toBe("Paneer, butter");
    expect(rows[0].price).toBe("180");
  });

  it("ignores a price invented in a product photo reply", () => {
    const draft = readProductDraft('{"name":"Blue shirt","priceRupees":999,"brand":"House","colour":"Blue","veg":"nope"}');
    expect(draft).toEqual({
      name: "Blue shirt",
      category: "",
      description: "",
      veg: "NONE",
      brand: "House",
      colour: "Blue",
      durationMinutes: null
    });
    expect(draft && "priceRupees" in draft).toBe(false);
    expect(readProductDraft('{"priceRupees":50}')).toBeNull();
  });

  it("stops one save at 50 rows and at the plan limit", () => {
    expect(takeForSave(60, 0, 100000)).toEqual({ take: 50, skipped: 10 });
    expect(takeForSave(10, 98, 100)).toEqual({ take: 2, skipped: 8 });
    expect(takeForSave(3, 100, 100)).toEqual({ take: 0, skipped: 3 });
  });

  it("names the starter templates", () => {
    expect(STORE_TEMPLATES.map((template) => template.name)).toEqual([
      "Café",
      "Restaurant",
      "Mobile shop",
      "Clothing",
      "Kirana",
      "Salon",
      "Spa",
      "Clinic",
      "Gym",
      "Tutor"
    ]);
    expect(STORE_TEMPLATES.every((template) => template.groups.some((group) => group.items.length > 0))).toBe(true);
  });

  it("reads at most 50 dishes from a menu photo reply", () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({ name: `Item ${index}`, priceRupees: 10, veg: "NONE" }));
    expect(parseMenuDraft(JSON.stringify(rows))).toHaveLength(50);
  });
});

import { describe, expect, it } from "vitest";
import { customersCsv, isInactive, parseTags } from "../../lib/store/customers";

describe("customer list", () => {
  it("marks a customer inactive only after 60 days without an order", () => {
    const now = new Date("2026-10-21T00:00:00.000Z");
    const exactly = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    expect(isInactive(exactly, now)).toBe(false);
    expect(isInactive(new Date(exactly.getTime() - 1), now)).toBe(true);
    expect(isInactive(null, now)).toBe(false);
  });

  it("keeps short unique tags", () => {
    expect(parseTags(" VIP, regular, vip , , lunch club ")).toEqual(["VIP", "regular", "lunch club"]);
  });

  it("quotes commas in the CSV and includes only the consented columns", () => {
    const csv = customersCsv([
      {
        name: "Asha, Cafe",
        phone: "919876543210",
        orders: 2,
        spendPaise: 18050,
        lastOrder: "2026-10-20",
        tags: ["VIP"],
        inactive: false
      }
    ]);
    expect(csv.startsWith("\uFEFFname,phone,orders,spend,last order,tags,inactive\n")).toBe(true);
    expect(csv).toContain('"Asha, Cafe",919876543210,2,180.50,2026-10-20,VIP,no');
    expect(csv.toLowerCase()).not.toContain("reward");
  });
});

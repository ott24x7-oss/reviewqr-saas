import { describe, expect, it } from "vitest";
import { kotText, orderListSince } from "../../lib/store/order-window";

describe("order list window and KOT", () => {
  it("accepts a Kolkata day and rejects a pasted sentence", () => {
    const day = orderListSince("2026-10-25");
    expect(day.ok).toBe(true);
    if (!day.ok || !day.since) return;
    expect(day.since.toISOString()).toBe("2026-10-24T18:30:00.000Z");
    const empty = orderListSince("");
    expect(empty.ok && empty.since).toBeNull();
    expect(orderListSince("today").ok).toBe(false);
  });

  it("prints quantities, variants, notes, and the table", () => {
    const text = kotText({
      number: "1042",
      place: "Table 4",
      note: "Less sugar",
      items: [{ qty: 2, name: "Chai", note: "hot", variant: "Large" }]
    });
    expect(text).toBe("KOT #1042\nTable 4\n2 x Chai (Large · hot)\nLess sugar");
  });
});

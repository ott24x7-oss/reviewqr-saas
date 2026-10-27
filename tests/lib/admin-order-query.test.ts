import { describe, expect, it } from "vitest";
import { parseAdminOrderQuery } from "@/lib/admin/orders";

describe("admin order query", () => {
  it("parses approved status, pagination and sort fields", () => {
    expect(parseAdminOrderQuery(new URLSearchParams("status=PAID&page=3&pageSize=50&sort=totalPaise&dir=asc&q=invoice"))).toEqual({
      ok: true,
      data: { status: "PAID", page: 3, pageSize: 50, sort: "totalPaise", dir: "asc", q: "invoice" }
    });
  });
  it("rejects unsafe pagination and unknown statuses", () => {
    expect(parseAdminOrderQuery(new URLSearchParams("page=0")).ok).toBe(false);
    expect(parseAdminOrderQuery(new URLSearchParams("status=DROP_TABLE")).ok).toBe(false);
  });
  it("falls back to a safe sort for unknown sort keys", () => {
    expect(parseAdminOrderQuery(new URLSearchParams("sort=buyerPhone"))).toMatchObject({ ok: true, data: { sort: "createdAt", dir: "desc" } });
  });
});

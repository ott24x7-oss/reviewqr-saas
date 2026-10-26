import { describe, expect, it } from "vitest";
import { parseAdminQrStockQuery } from "@/lib/admin/tools";

describe("admin QR inventory filters", () => {
  it("accepts only supported status filters", () => {
    expect(parseAdminQrStockQuery({ status: "ACTIVE" }).status).toBe("ACTIVE");
    expect(parseAdminQrStockQuery({ status: "DELETE" }).status).toBe("");
  });
  it("trims and bounds search terms", () => {
    expect(parseAdminQrStockQuery({ q: "  abc  " }).q).toBe("abc");
    expect(parseAdminQrStockQuery({ q: "x".repeat(200) }).q).toHaveLength(120);
  });
});

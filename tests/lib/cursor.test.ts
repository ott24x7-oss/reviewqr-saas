import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, readPage } from "../../lib/api/cursor";
import { codeForStatus } from "../../lib/api/result";

describe("cursor pages", () => {
  it("round-trips an id and rejects a forged cursor", () => {
    const cursor = encodeCursor("cm123");
    expect(decodeCursor(cursor)).toBe("cm123");
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("not-a-cursor")).toBe("bad");
  });

  it("defaults to 20 and caps at 100", () => {
    expect(readPage(new URLSearchParams())).toEqual({ limit: 20, cursorId: null });
    expect(readPage(new URLSearchParams("limit=100"))).toEqual({ limit: 100, cursorId: null });
    expect(readPage(new URLSearchParams("limit=101"))).toEqual({ ok: false, error: "limit must be from 1 to 100" });
    expect(readPage(new URLSearchParams("limit=0"))).toEqual({ ok: false, error: "limit must be from 1 to 100" });
  });

  it("maps plan limits and conflicts onto the public error codes", () => {
    expect(codeForStatus(402)).toBe("PLAN_LIMIT");
    expect(codeForStatus(409)).toBe("CONFLICT");
    expect(codeForStatus(503)).toBe("INTERNAL");
  });
});

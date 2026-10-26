import { describe, expect, it } from "vitest";
import { parseAppEvent } from "../../lib/app/events";

const installId = "8b1b2c3d-4e5f-4a6b-8c7d-1234567890ab";

describe("app events", () => {
  it("accepts a named event and a random install id", () => {
    expect(parseAppEvent({ name: "app_open", installId })).toEqual({
      ok: true,
      name: "app_open",
      installId
    });
  });

  it("rejects account fields and unknown names", () => {
    expect(parseAppEvent({ name: "app_open", installId, email: "a@b.co" }).ok).toBe(false);
    expect(parseAppEvent({ name: "app_open", installId, phone: "9876543210" }).ok).toBe(false);
    expect(parseAppEvent({ name: "purchase", installId }).ok).toBe(false);
    expect(parseAppEvent({ name: "app_open", installId: "not-a-uuid" }).ok).toBe(false);
  });
});

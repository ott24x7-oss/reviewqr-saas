import { describe, expect, it } from "vitest";
import { campaignMessage } from "../../lib/owner/mobile-extra";

describe("campaign message", () => {
  it("fills the customer name and drops a blank name to a greeting", () => {
    expect(campaignMessage("Hi {name}, your table is ready", "Asha")).toBe("Hi Asha, your table is ready");
    expect(campaignMessage("Hi {name}", "  ")).toBe("Hi there");
  });

  it("keeps the message inside 1000 characters", () => {
    const text = campaignMessage("x".repeat(1200), "Ada");
    expect(text.length).toBe(1000);
  });
});

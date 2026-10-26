import { describe, expect, it } from "vitest";
import { adminSettingsSection } from "@/lib/admin/site-admin";

describe("admin merged settings sections", () => {
  it("accepts supported section tabs and uses the safe default otherwise", () => {
    expect(adminSettingsSection("branding", ["settings", "branding"], "settings")).toBe("branding");
    expect(adminSettingsSection("arbitrary", ["settings", "branding"], "settings")).toBe("settings");
    expect(adminSettingsSection(["presets"], ["themes", "presets"], "themes")).toBe("themes");
  });
});

import { describe, expect, it } from "vitest";
import { maskAdminConfig } from "@/lib/admin/channel-settings";

describe("admin channel settings", () => {
  it("masks credentials before a settings object reaches a client form", () => {
    expect(maskAdminConfig({ smtpPass: "password-secret", relaySecret: "", host: "mail.example.com" }, ["smtpPass", "relaySecret"])).toEqual({
      smtpPass: `pas${"•".repeat(9)}ret`,
      relaySecret: "",
      host: "mail.example.com"
    });
  });
});

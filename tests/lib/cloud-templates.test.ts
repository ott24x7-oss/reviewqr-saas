import { describe, expect, it } from "vitest";
import { cloudTemplateStatus } from "../../lib/admin/cloud-templates";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

describe("cloud template status", () => {
  it("stays unconfigured without a token or phone id", async () => {
    const status = await cloudTemplateStatus({ apiUrl: "https://graph.facebook.com/v20.0", apiToken: "", phoneId: "" });
    expect(status).toEqual({ configured: false, templates: [] });
  });

  it("reads name, language, and status and never returns the token", async () => {
    const seen: string[] = [];
    const fetchImpl = (async (url: string) => {
      seen.push(url);
      if (url.includes("message_templates")) {
        return jsonResponse({
          data: [
            { name: "order_update", language: { code: "en" }, status: "APPROVED" },
            { name: "otp", language: "hi", status: "PENDING" },
            { name: "", language: "en", status: "REJECTED" }
          ]
        });
      }
      return jsonResponse({ whatsapp_business_account: { id: "waba-1" } });
    }) as typeof fetch;
    const status = await cloudTemplateStatus(
      { apiUrl: "https://graph.facebook.com/v20.0", apiToken: "secret-token", phoneId: "phone-1" },
      fetchImpl
    );
    expect(status).toEqual({
      configured: true,
      templates: [
        { name: "order_update", language: "en", status: "APPROVED" },
        { name: "otp", language: "hi", status: "PENDING" }
      ]
    });
    expect(seen[0]).toContain("/phone-1?fields=whatsapp_business_account");
    expect(seen[1]).toContain("/waba-1/message_templates");
    expect(JSON.stringify(status)).not.toContain("secret-token");
  });

  it("stays configured with an empty list when Cloud is unreachable", async () => {
    const fetchImpl = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    const status = await cloudTemplateStatus(
      { apiUrl: "https://graph.facebook.com/v20.0", apiToken: "secret-token", phoneId: "phone-1" },
      fetchImpl
    );
    expect(status).toEqual({ configured: true, templates: [] });
  });
});

import { scrubSentryEvent, scrubText, sentryIdentity } from "../src/sentry/scrub";

describe("Sentry identity", () => {
  it("builds release and dist from the app version and versionCode", () => {
    expect(sentryIdentity("1.0.0", 3)).toEqual({
      release: "com.qr24x7.app@1.0.0+3",
      dist: "3"
    });
  });
});

describe("Sentry scrub", () => {
  it("strips email, phone, and tokens from text", () => {
    const text = scrubText(
      "Owner hello@qr24x7.in called +91 98765 43210 with Bearer abc.def.ghi and eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signatureok"
    );
    expect(text).not.toContain("hello@qr24x7.in");
    expect(text).not.toContain("98765");
    expect(text).not.toContain("Bearer abc");
    expect(text).not.toContain("eyJhbGciOi");
    expect(text).toContain("[email]");
    expect(text).toContain("[phone]");
    expect(text).toContain("[token]");
  });

  it("drops user and secret fields from an event", () => {
    const event = scrubSentryEvent({
      message: "login failed for admin@reviewqr.in",
      user: { email: "admin@reviewqr.in", id: "user_1" },
      extra: { phone: "9876543210", note: "plan ok" },
      request: { headers: { Authorization: "Bearer secret-token" } }
    });
    expect(event.user).toBeUndefined();
    expect(event.message).not.toContain("admin@reviewqr.in");
    expect(event.extra).toEqual({ phone: "[redacted]", note: "plan ok" });
    expect(JSON.stringify(event.request)).not.toContain("secret-token");
  });
});

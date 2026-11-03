import { describe, expect, it } from "vitest";
import {
  EMAIL_OTP_NOTICE,
  emailOtpLimits,
  emailOtpMessage,
  emailOtpRequestBody,
  normalizeEmail
} from "../../lib/email-otp";

describe("email OTP helpers", () => {
  it("normalizes email addresses for lookup and limiting", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
    expect(emailOtpLimits(" Owner@Example.COM ")).toEqual([
      { key: "email-otp-cooldown:owner@example.com", limit: 1, windowSeconds: 30 },
      { key: "email-otp-req:owner@example.com", limit: 5, windowSeconds: 900 }
    ]);
  });

  it("returns the same generic request shape for an unknown email", () => {
    const unknown = emailOtpRequestBody(false);
    expect(unknown).toEqual({
      sent: true,
      channel: "email",
      resendAfterSec: 30,
      message: EMAIL_OTP_NOTICE
    });
    expect(unknown).toEqual(emailOtpRequestBody(true));
  });

  it("builds a short bilingual code email with ten-minute expiry", () => {
    const message = emailOtpMessage("123456", "QR24x7");
    expect(message).toContain("*123456* is your QR24x7 email sign-in code.");
    expect(message).toContain("Valid for 10 minutes.");
    expect(message).toContain("*123456* आपका QR24x7 ईमेल लॉगिन कोड है।");
    expect(message).toContain("यह 10 मिनट तक मान्य है।");
  });
});

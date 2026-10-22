import { describe, expect, it, vi } from "vitest";
import { devOtpCode, otpRequestBody, warnDevOtpInProduction } from "../../lib/auth/dev-otp";
import { LOGIN_OTP_NOTICE } from "../../lib/otp-message";

describe("OTP dev reveal", () => {
  it("does not reveal the code when NODE_ENV is production", () => {
    const env = { NODE_ENV: "production", OTP_DEV_REVEAL: "1" };
    expect(devOtpCode("123456", env)).toBeUndefined();
    const body = otpRequestBody("123456", env);
    expect(body).toEqual({ sent: true });
    expect(body).not.toHaveProperty("devCode");
  });

  it("ignores any flag value in production", () => {
    expect(otpRequestBody("123456", { NODE_ENV: "production", OTP_DEV_REVEAL: "true" })).toEqual({
      sent: true
    });
  });

  it("returns the code only outside production when the flag is set", () => {
    expect(otpRequestBody("123456", { NODE_ENV: "development", OTP_DEV_REVEAL: "1" })).toEqual({
      sent: true,
      devCode: "123456"
    });
  });

  it("omits the code when the flag is unset", () => {
    expect(otpRequestBody("123456", { NODE_ENV: "development" })).toEqual({ sent: true });
    expect(otpRequestBody("123456", { NODE_ENV: "test", OTP_DEV_REVEAL: "" })).toEqual({ sent: true });
  });

  it("does not invent a code for a missing account", () => {
    expect(otpRequestBody(null, { NODE_ENV: "development", OTP_DEV_REVEAL: "1" })).toEqual({ sent: true });
  });

  it("returns the same public login body for a known and an unknown number in production", () => {
    const extra = { channel: "whatsapp" as const, resendAfterSec: 30, message: LOGIN_OTP_NOTICE };
    const env = { NODE_ENV: "production", OTP_DEV_REVEAL: "1" };
    const known = otpRequestBody("123456", env, extra);
    const unknown = otpRequestBody(null, env, extra);
    expect(known).toEqual(unknown);
    expect(known).toEqual({
      sent: true,
      channel: "whatsapp",
      resendAfterSec: 30,
      message: LOGIN_OTP_NOTICE
    });
    expect(known).not.toHaveProperty("devCode");
  });

  it("warns at startup only when the flag is set in production", () => {
    const warn = vi.fn();
    warnDevOtpInProduction({ NODE_ENV: "production", OTP_DEV_REVEAL: "1" }, warn);
    warnDevOtpInProduction({ NODE_ENV: "production" }, warn);
    warnDevOtpInProduction({ NODE_ENV: "development", OTP_DEV_REVEAL: "1" }, warn);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "[otp] OTP_DEV_REVEAL is set but ignored because NODE_ENV is production"
    );
  });
});

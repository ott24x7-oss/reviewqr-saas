import { OTP_RESEND_AFTER_SEC, type OtpLimit } from "./otp-message";

export const EMAIL_OTP_PURPOSE = "email-login";
export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_NOTICE = "If an account exists for this email, a code was sent.";

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function emailOtpLimits(email: string): OtpLimit[] {
  const key = normalizeEmail(email);
  return [
    { key: `email-otp-cooldown:${key}`, limit: 1, windowSeconds: OTP_RESEND_AFTER_SEC },
    { key: `email-otp-req:${key}`, limit: 5, windowSeconds: 900 }
  ];
}

/** The same public response is returned for known and unknown email addresses. */
export function emailOtpRequestBody(_accountExists: boolean) {
  return {
    sent: true as const,
    channel: "email" as const,
    resendAfterSec: OTP_RESEND_AFTER_SEC,
    message: EMAIL_OTP_NOTICE
  };
}

export function emailOtpMessage(code: string, brand: string) {
  return [
    `*${code}* is your ${brand} email sign-in code.`,
    "Valid for 10 minutes. Do not share this code with anyone.",
    "",
    `*${code}* आपका ${brand} ईमेल लॉगिन कोड है।`,
    "यह 10 मिनट तक मान्य है। यह कोड किसी से साझा न करें।"
  ].join("\n");
}

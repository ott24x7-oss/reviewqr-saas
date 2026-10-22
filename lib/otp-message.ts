/**
 * Pure OTP delivery helpers. No database and no app aliases, so unit tests
 * can drive the fallback order with fakes.
 */

export const OTP_BRAND_FALLBACK = "ReviewQR";
export const OTP_RESEND_AFTER_SEC = 30;
export const LOGIN_OTP_NOTICE = "If this number is registered, a code was sent";
export const OTP_INVALID = "Invalid code";
export const OTP_EXPIRED = "Code expired. Request a new one.";
export const OTP_TOO_MANY = "Too many attempts. Request a new code.";

export type OtpChannel = "whatsapp" | "email" | "dev" | "none";

/** Missing rows stay "Invalid code" so an unknown number is not revealed. */
export function otpGateError(
  row: { expires: Date; attempts: number } | null,
  maxAttempts: number,
  now = Date.now()
) {
  if (!row) return OTP_INVALID;
  if (row.expires.getTime() <= now) return OTP_EXPIRED;
  if (row.attempts >= maxAttempts) return OTP_TOO_MANY;
  return null;
}

export function otpWrongCodeError(nextAttempts: number, maxAttempts: number) {
  return nextAttempts >= maxAttempts ? OTP_TOO_MANY : OTP_INVALID;
}

export function otpBrandName(raw: string | null | undefined) {
  const name = (raw ?? "").trim();
  return name || OTP_BRAND_FALLBACK;
}

/** Hindi and English in one message. Brand is the platform name. */
export function otpLoginMessage(code: string, brand: string) {
  const name = otpBrandName(brand);
  return `${code} is your ${name} login code. Valid 5 minutes. Do not share it with anyone. / ${code} आपका ${name} लॉगिन कोड है। 5 मिनट तक वैध। किसी से शेयर न करें।`;
}

/** Last 10 digits become +91. Shorter input is not a sendable number. */
export function indiaE164(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return `+91${digits.slice(-10)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type DeliverOtpDeps = {
  phone: string;
  email?: string | null;
  code: string;
  brand: string;
  baileysConnected: boolean;
  cloudConfigured: boolean;
  env?: string;
  sendBaileys: (toE164: string, message: string) => Promise<unknown>;
  sendCloud: (toE164: string, message: string) => Promise<unknown>;
  sendMail: (to: string, subject: string, html: string) => Promise<unknown>;
  log?: (line: string) => void;
};

/**
 * Baileys (only when connected) → Cloud API (when a token and phone id exist)
 * → email → a dev log outside production. Each failure falls through.
 * This function never throws.
 */
export async function deliverOtpCode(opts: DeliverOtpDeps): Promise<OtpChannel> {
  const to = indiaE164(opts.phone);
  if (!to) return "none";
  const brand = otpBrandName(opts.brand);
  const message = otpLoginMessage(opts.code, brand);

  if (opts.baileysConnected) {
    try {
      await opts.sendBaileys(to, message);
      return "whatsapp";
    } catch {
      /* try the next channel */
    }
  }

  if (opts.cloudConfigured) {
    try {
      await opts.sendCloud(to, message);
      return "whatsapp";
    } catch {
      /* try the next channel */
    }
  }

  if (opts.email) {
    try {
      await opts.sendMail(
        opts.email,
        `Your ${brand} login code`,
        `<p>${escapeHtml(message)}</p>`
      );
      return "email";
    } catch {
      /* try the next channel */
    }
  }

  if (opts.env !== "production") {
    opts.log?.(`[otp] ${to} code ${opts.code}`);
    return "dev";
  }
  return "none";
}

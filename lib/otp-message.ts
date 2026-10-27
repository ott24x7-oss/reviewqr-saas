/**
 * Pure OTP delivery helpers. No database and no app aliases, so unit tests
 * can drive the fallback order with fakes.
 */

export const OTP_BRAND_FALLBACK = "QR24x7";
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

export type OtpLimit = { key: string; limit: number; windowSeconds: number };

/** 8 per IP in production. Browser tests raise it with OTP_IP_LIMIT (same pattern as REGISTER_IP_LIMIT). */
function otpIpLimit() {
  const value = Number(process.env.OTP_IP_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : 8;
}

/** Existing windows stay. The 15-minute and 30-second keys are extra. */
export function otpIpLimits(ip: string, scope: "login" | "signup"): OtpLimit[] {
  const limit = otpIpLimit();
  const first =
    scope === "signup"
      ? { key: `otp-signup:${ip}`, limit, windowSeconds: 600 }
      : { key: `otp-req:${ip}`, limit, windowSeconds: 600 };
  return [first, { key: `otp-req-15:${ip}`, limit: Math.max(limit, 20), windowSeconds: 900 }];
}

/** Agent onboarding OTP. Five an hour to one phone, ten an hour from one agent. */
export function agentOnboardLimits(phoneKey: string, agentId: string): OtpLimit[] {
  return [
    { key: `agent-onboard-phone:${phoneKey}`, limit: 5, windowSeconds: 3600 },
    { key: `agent-onboard-agent:${agentId}`, limit: 10, windowSeconds: 3600 }
  ];
}

export function otpPhoneLimits(phoneKey: string): OtpLimit[] {
  return [
    { key: `otp-phone:${phoneKey}`, limit: 5, windowSeconds: 600 },
    { key: `otp-phone-15:${phoneKey}`, limit: 5, windowSeconds: 900 },
    { key: `otp-cooldown:${phoneKey}`, limit: 1, windowSeconds: 30 }
  ];
}

export async function enforceOtpLimits(
  limits: OtpLimit[],
  limiter: (limit: OtpLimit) => Promise<{ ok: boolean }>
) {
  for (const limit of limits) {
    const result = await limiter(limit);
    if (!result.ok) return { ok: false as const, key: limit.key };
  }
  return { ok: true as const };
}

export function otpLimitMessage(key: string) {
  if (key.startsWith("otp-cooldown:")) return "Please wait 30 seconds before requesting another code.";
  return "Too many attempts";
}

/** Same last-10 rule as phoneKey. Kept here so limit checks do not import the database. */
export function phoneKeyFromRaw(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

export function phoneKeyFromBody(body: unknown) {
  if (!body || typeof body !== "object") return "";
  const phone = (body as { phone?: unknown }).phone;
  if (typeof phone !== "string") return "";
  return phoneKeyFromRaw(phone);
}

export function isSignupRequest(body: unknown) {
  return !!body && typeof body === "object" && (body as { action?: unknown }).action === "request";
}

export function otpBrandName(raw: string | null | undefined) {
  const name = (raw ?? "").trim();
  return name || OTP_BRAND_FALLBACK;
}

/**
 * Hindi and English in one WhatsApp message. The code leads the first line so the
 * phone's notification preview shows it, and *bold* is WhatsApp formatting.
 */
export function otpLoginMessage(code: string, brand: string) {
  const name = otpBrandName(brand);
  return [
    `*${code}* is your ${name} login code.`,
    "",
    "Valid for 5 minutes. Do not share this code with anyone.",
    `${name} will never call or message you to ask for it.`,
    "",
    "———",
    "",
    `*${code}* आपका ${name} लॉगिन कोड है।`,
    "",
    "यह 5 मिनट तक मान्य है। यह कोड किसी को न बताएं।",
    `${name} कभी कॉल या मैसेज करके यह कोड नहीं मांगेगा।`
  ].join("\n");
}

/** The WhatsApp text as email HTML: no asterisks, line breaks kept, the code bold. */
export function otpEmailHtml(message: string) {
  return message
    .split("\n")
    .map((line) => escapeHtml(line).replace(/\*([^*]+)\*/g, "<strong>$1</strong>"))
    .join("<br>");
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
        `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${otpEmailHtml(message)}</p>`
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

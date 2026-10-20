/**
 * Mobile OTP login. The code is hashed, expires in 5 minutes, and locks after
 * too many wrong attempts. Delivery is WhatsApp Cloud when that provider is
 * configured, otherwise the user's email, otherwise a development log.
 */
import { prisma } from "./db";
import { sendEmail } from "./email";
import { getWhatsAppConfig } from "./settings";
import { sendWhatsAppCloud } from "./whatsapp";
import { hashToken, randomOtpCode, randomToken } from "./tokens";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_SESSION_TTL_MS = 2 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function otpStillValid(expires: Date, attempts: number, now = Date.now()) {
  return expires.getTime() > now && attempts < OTP_MAX_ATTEMPTS;
}

export function phoneKey(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return "";
  return digits.slice(-10);
}

export async function findUserByPhone(raw: string) {
  const key = phoneKey(raw);
  if (!key) return null;
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { phone: key },
        { phone: `+91${key}` },
        { phone: `91${key}` },
        { phone: { endsWith: key } }
      ]
    }
  });
}

async function deliverCode(opts: { phone: string; email?: string | null; code: string }) {
  const wa = await getWhatsAppConfig();
  const cloudReady = wa.provider === "cloud-api" && !!wa.apiToken && !!wa.phoneId;
  const message = `Your ReviewQR login code is ${opts.code}. It expires in 5 minutes.`;
  if (cloudReady) {
    await sendWhatsAppCloud({ to: opts.phone, message });
    return "whatsapp" as const;
  }
  if (opts.email) {
    await sendEmail({
      to: opts.email,
      subject: "Your ReviewQR login code",
      html: `<p>Your login code is <b>${opts.code}</b>. It expires in 5 minutes.</p>`
    });
    return "email" as const;
  }
  if (process.env.NODE_ENV === "development") {
    console.info(`[otp] ${opts.phone} code ${opts.code}`);
    return "log" as const;
  }
  return "none" as const;
}

/** Always resolves for a well-formed phone. Missing accounts get the same result. */
export async function requestLoginOtp(rawPhone: string) {
  const key = phoneKey(rawPhone);
  if (!key) return { ok: false as const, error: "Enter a valid mobile number" };

  const user = await findUserByPhone(rawPhone);
  if (!user || user.deletedAt) return { ok: true as const };

  const code = randomOtpCode();
  const expires = new Date(Date.now() + OTP_TTL_MS);
  await prisma.emailOtp.deleteMany({ where: { identifier: key, purpose: "login" } });
  await prisma.emailOtp.create({
    data: {
      identifier: key,
      tokenHash: hashToken(code),
      channel: "phone",
      purpose: "login",
      expires,
      attempts: 0
    }
  });
  await deliverCode({ phone: rawPhone, email: user.email, code });
  return { ok: true as const };
}

/** Returns a one-time session token the credentials provider can exchange. */
export async function verifyLoginOtp(rawPhone: string, code: string) {
  const key = phoneKey(rawPhone);
  if (!key || !/^\d{6}$/.test(code)) return { ok: false as const, error: "Invalid code" };

  const row = await prisma.emailOtp.findFirst({
    where: { identifier: key, purpose: "login" },
    orderBy: { createdAt: "desc" }
  });
  if (!row || !otpStillValid(row.expires, row.attempts)) {
    return { ok: false as const, error: "Code expired. Request a new one." };
  }
  if (row.tokenHash !== hashToken(code)) {
    const attempts = row.attempts + 1;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.emailOtp.delete({ where: { id: row.id } });
    } else {
      await prisma.emailOtp.update({ where: { id: row.id }, data: { attempts } });
    }
    return { ok: false as const, error: "Invalid code" };
  }

  const user = await findUserByPhone(rawPhone);
  if (!user || user.deletedAt) return { ok: false as const, error: "Invalid code" };

  await prisma.emailOtp.deleteMany({ where: { identifier: key, purpose: "login" } });
  const otpToken = randomToken();
  await prisma.emailOtp.create({
    data: {
      identifier: user.id,
      tokenHash: hashToken(otpToken),
      channel: "phone",
      purpose: "session",
      expires: new Date(Date.now() + OTP_SESSION_TTL_MS),
      attempts: 0
    }
  });
  return { ok: true as const, otpToken };
}

/** Single use. Returns the user id or null. */
export async function consumeOtpSession(otpToken: string) {
  if (!otpToken) return null;
  const tokenHash = hashToken(otpToken);
  const row = await prisma.emailOtp.findFirst({
    where: { tokenHash, purpose: "session" }
  });
  if (!row || row.expires.getTime() <= Date.now()) {
    if (row) await prisma.emailOtp.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  await prisma.emailOtp.delete({ where: { id: row.id } });
  const user = await prisma.user.findUnique({ where: { id: row.identifier } });
  if (!user || user.deletedAt) return null;
  return user;
}

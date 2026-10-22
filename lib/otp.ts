/**
 * Mobile OTP login. The code is hashed, expires in 5 minutes, and locks after
 * too many wrong attempts. Delivery tries the connected Baileys session, then
 * WhatsApp Cloud when a token and phone id are saved, then email, then a
 * non-production log. A failed send falls through and never throws.
 */
import { prisma } from "./db";
import { sendEmail } from "./email";
import { getWhatsAppConfig } from "./settings";
import { sendWhatsAppCloud } from "./whatsapp";
import { hashToken, randomOtpCode, randomToken } from "./tokens";
import {
  deliverOtpCode,
  otpBrandName,
  otpGateError,
  otpWrongCodeError,
  phoneKeyFromRaw,
  type OtpChannel
} from "./otp-message";

export type { OtpChannel };

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_SESSION_TTL_MS = 2 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function otpStillValid(expires: Date, attempts: number, now = Date.now()) {
  return expires.getTime() > now && attempts < OTP_MAX_ATTEMPTS;
}

export function phoneKey(raw: string) {
  return phoneKeyFromRaw(raw);
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

export async function preferredOtpChannel(): Promise<"whatsapp" | "email"> {
  try {
    const { getBaileys } = await import("./whatsapp-baileys");
    if (getBaileys().isConnected()) return "whatsapp";
  } catch {
    /* try Cloud next */
  }
  try {
    const wa = await getWhatsAppConfig();
    if (wa.apiToken && wa.phoneId) return "whatsapp";
  } catch {
    /* email is the public fallback */
  }
  return "email";
}

async function rejectIfUnusable(row: { expires: Date; attempts: number } | null) {
  const error = otpGateError(row, OTP_MAX_ATTEMPTS);
  if (!error) return null;
  return { ok: false as const, error };
}

async function noteWrongCode(row: { id: string; attempts: number }) {
  const attempts = row.attempts + 1;
  if (attempts >= OTP_MAX_ATTEMPTS) await prisma.emailOtp.delete({ where: { id: row.id } });
  else await prisma.emailOtp.update({ where: { id: row.id }, data: { attempts } });
  return { ok: false as const, error: otpWrongCodeError(attempts, OTP_MAX_ATTEMPTS) };
}

async function platformBrand() {
  try {
    const row = await prisma.platformBranding.findUnique({
      where: { id: "singleton" },
      select: { brandName: true }
    });
    return otpBrandName(row?.brandName);
  } catch {
    return otpBrandName(null);
  }
}

async function deliverCode(opts: { phone: string; email?: string | null; code: string }): Promise<OtpChannel> {
  const brand = await platformBrand();
  let baileysConnected = false;
  try {
    const { getBaileys } = await import("./whatsapp-baileys");
    baileysConnected = getBaileys().isConnected();
  } catch {
    baileysConnected = false;
  }
  let cloudConfigured = false;
  try {
    const wa = await getWhatsAppConfig();
    cloudConfigured = !!(wa.apiToken && wa.phoneId);
  } catch {
    cloudConfigured = false;
  }

  let channel: OtpChannel = "none";
  try {
    channel = await deliverOtpCode({
      phone: opts.phone,
      email: opts.email,
      code: opts.code,
      brand,
      baileysConnected,
      cloudConfigured,
      env: process.env.NODE_ENV,
      sendBaileys: async (to, message) => {
        const { getBaileys } = await import("./whatsapp-baileys");
        await getBaileys().sendText(to, message);
      },
      sendCloud: async (to, message) => {
        await sendWhatsAppCloud({ to, message });
      },
      sendMail: async (to, subject, html) => {
        await sendEmail({ to, subject, html });
      },
      log: (line) => {
        if (process.env.NODE_ENV === "production") return;
        console.info(line);
      }
    });
  } catch {
    channel = "none";
  }

  if (channel === "whatsapp" || channel === "email" || channel === "dev") {
    await prisma.otpDelivery.create({ data: { channel } }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn("[otp] delivery log failed:", message);
    });
  }
  return channel;
}

/** Always resolves for a well-formed phone. Missing accounts get the same result. */
export async function requestLoginOtp(rawPhone: string) {
  const key = phoneKey(rawPhone);
  if (!key) return { ok: false as const, error: "Enter a valid mobile number" };

  const user = await findUserByPhone(rawPhone);
  if (!user || user.deletedAt) {
    return { ok: true as const, issuedCode: null as string | null, channel: null as OtpChannel | null };
  }

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
  const channel = await deliverCode({ phone: rawPhone, email: user.email, code });
  return { ok: true as const, issuedCode: code, channel };
}

/** Returns a one-time session token the credentials provider can exchange. */
export async function verifyLoginOtp(rawPhone: string, code: string) {
  const key = phoneKey(rawPhone);
  if (!key || !/^\d{6}$/.test(code)) return { ok: false as const, error: "Invalid code" };

  const row = await prisma.emailOtp.findFirst({
    where: { identifier: key, purpose: "login" },
    orderBy: { createdAt: "desc" }
  });
  const blocked = await rejectIfUnusable(row);
  if (blocked) return blocked;
  if (!row) return { ok: false as const, error: "Invalid code" };
  if (row.tokenHash !== hashToken(code)) return noteWrongCode(row);

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

export async function createOtpSession(userId: string) {
  const otpToken = randomToken();
  await prisma.emailOtp.create({
    data: {
      identifier: userId,
      tokenHash: hashToken(otpToken),
      channel: "phone",
      purpose: "session",
      expires: new Date(Date.now() + OTP_SESSION_TTL_MS),
      attempts: 0
    }
  });
  return otpToken;
}

/** Signup codes are sent even when no account exists yet. */
export async function requestSignupOtp(rawPhone: string, email?: string | null) {
  const key = phoneKey(rawPhone);
  if (!key) return { ok: false as const, error: "Enter a valid mobile number" };
  const code = randomOtpCode();
  await prisma.emailOtp.deleteMany({ where: { identifier: key, purpose: "signup" } });
  await prisma.emailOtp.create({
    data: {
      identifier: key,
      tokenHash: hashToken(code),
      channel: "phone",
      purpose: "signup",
      expires: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0
    }
  });
  const channel = await deliverCode({ phone: rawPhone, email, code });
  if (channel === "none") return { ok: false as const, error: "We could not send a code right now" };
  return { ok: true as const, channel, issuedCode: code };
}

export async function verifySignupOtp(rawPhone: string, code: string) {
  const key = phoneKey(rawPhone);
  if (!key || !/^\d{6}$/.test(code)) return { ok: false as const, error: "Invalid code" };
  const row = await prisma.emailOtp.findFirst({
    where: { identifier: key, purpose: "signup" },
    orderBy: { createdAt: "desc" }
  });
  const blocked = await rejectIfUnusable(row);
  if (blocked) return blocked;
  if (!row) return { ok: false as const, error: "Invalid code" };
  if (row.tokenHash !== hashToken(code)) return noteWrongCode(row);
  await prisma.emailOtp.deleteMany({ where: { identifier: key, purpose: "signup" } });
  return { ok: true as const, phone: key };
}

export async function requestPurposeOtp(opts: { identifier: string; phone: string; purpose: string; email?: string | null }) {
  const key = phoneKey(opts.phone);
  if (!key) return { ok: false as const, error: "Enter a valid mobile number" };
  const code = randomOtpCode();
  await prisma.emailOtp.deleteMany({ where: { identifier: opts.identifier, purpose: opts.purpose } });
  await prisma.emailOtp.create({
    data: {
      identifier: opts.identifier,
      tokenHash: hashToken(code),
      channel: "phone",
      purpose: opts.purpose,
      expires: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0
    }
  });
  const channel = await deliverCode({ phone: opts.phone, email: opts.email, code });
  if (channel === "none") return { ok: false as const, error: "We could not send a code right now" };
  return { ok: true as const, phone: key, channel, issuedCode: code };
}

export async function verifyPurposeOtp(identifier: string, purpose: string, code: string) {
  if (!/^\d{6}$/.test(code)) return { ok: false as const, error: "Invalid code" };
  const row = await prisma.emailOtp.findFirst({
    where: { identifier, purpose },
    orderBy: { createdAt: "desc" }
  });
  const blocked = await rejectIfUnusable(row);
  if (blocked) return blocked;
  if (!row) return { ok: false as const, error: "Invalid code" };
  if (row.tokenHash !== hashToken(code)) return noteWrongCode(row);
  await prisma.emailOtp.delete({ where: { id: row.id } });
  return { ok: true as const };
}

const SIGNUP_PROOF_TTL_MS = 10 * 60 * 1000;

/** Short-lived proof that the signup code was checked, before the business name is collected. */
export async function issueSignupProof(phone: string) {
  const proof = randomToken();
  await prisma.emailOtp.deleteMany({ where: { identifier: phone, purpose: "signup-proof" } });
  await prisma.emailOtp.create({
    data: {
      identifier: phone,
      tokenHash: hashToken(proof),
      channel: "phone",
      purpose: "signup-proof",
      expires: new Date(Date.now() + SIGNUP_PROOF_TTL_MS),
      attempts: 0
    }
  });
  return proof;
}

export async function consumeSignupProof(rawPhone: string, proof: string) {
  const key = phoneKey(rawPhone);
  if (!key || proof.length < 16) return null;
  const row = await prisma.emailOtp.findFirst({
    where: { identifier: key, purpose: "signup-proof", tokenHash: hashToken(proof) }
  });
  if (!row || row.expires.getTime() <= Date.now()) {
    if (row) await prisma.emailOtp.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }
  await prisma.emailOtp.delete({ where: { id: row.id } });
  return key;
}

export async function otpDeliveryStats() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [last, grouped] = await Promise.all([
    prisma.otpDelivery.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, channel: true }
    }),
    prisma.otpDelivery.groupBy({
      by: ["channel"],
      where: { createdAt: { gte: start } },
      _count: { _all: true }
    })
  ]);
  const counts = { whatsapp: 0, email: 0, dev: 0 };
  for (const row of grouped) {
    if (row.channel === "whatsapp" || row.channel === "email" || row.channel === "dev") {
      counts[row.channel] = row._count._all;
    }
  }
  return {
    lastAt: last?.createdAt.toISOString() ?? null,
    lastChannel: last?.channel ?? null,
    counts
  };
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

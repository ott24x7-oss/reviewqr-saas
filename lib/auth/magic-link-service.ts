import { prisma } from "../db";
import { findUserByPhone, issueSignupProof } from "../otp";
import { rateLimitDb } from "../rate-limit";
import { getSiteConfig } from "../settings";
import {
  createMagicLinkSecret,
  magicLinkHash,
  magicLinkHashMatches,
  magicLinkRateLimitAllowed,
  magicLinkRequestPhone,
  MAGIC_LINK_RATE_LIMIT,
  MAGIC_LINK_RATE_WINDOW_SECONDS
} from "./magic-link";

const DEFAULT_APP_URL = "https://qr24x7.in";

async function appUrl() {
  try {
    const site = await getSiteConfig();
    return (site.appUrl || process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
  } catch {
    return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/$/, "");
  }
}

export async function magicLinkReplyForPhone(rawPhone: string) {
  const phone = magicLinkRequestPhone(rawPhone);
  if (!phone) return null;

  const rateLimit = await rateLimitDb({
    key: `magic-link:${phone}`,
    limit: MAGIC_LINK_RATE_LIMIT,
    windowSeconds: MAGIC_LINK_RATE_WINDOW_SECONDS
  });
  const countInWindow = MAGIC_LINK_RATE_LIMIT - rateLimit.remaining;
  if (!rateLimit.ok || !magicLinkRateLimitAllowed(countInWindow)) return null;

  const [user, origin] = await Promise.all([findUserByPhone(rawPhone), appUrl()]);
  if (!user || user.deletedAt) {
    const signupToken = await issueSignupProof(phone);
    const signupUrl = new URL(`/register?signup=${encodeURIComponent(signupToken)}`, origin).toString();
    return [
      `Create your QR24x7 account (valid for 10 minutes, one time): ${signupUrl}`,
      `अपना QR24x7 अकाउंट बनाएँ (लिंक 10 मिनट तक मान्य है और केवल एक बार इस्तेमाल होगा): ${signupUrl}`,
      "If you did not request this, ignore this message."
    ].join("\n\n");
  }
  if (user.suspendedAt) return null;

  const secret = createMagicLinkSecret();
  await prisma.magicLinkToken.create({
    data: {
      tokenHash: secret.tokenHash,
      phone,
      userId: user.id,
      expiresAt: secret.expiresAt
    }
  });

  const loginUrl = new URL(`/m/${secret.token}`, origin).toString();
  return [
    `Your QR24x7 login link (valid 10 minutes, one time): ${loginUrl}`,
    "आपका QR24x7 लॉगिन लिंक 10 मिनट तक मान्य है और केवल एक बार इस्तेमाल किया जा सकता है।",
    "If you did not ask for this, ignore this message."
  ].join("\n\n");
}

/** Looks up by token hash, then marks used in a conditional update inside a transaction. */
export async function consumeMagicLink(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = magicLinkHash(token);
  const candidate = await prisma.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!candidate || !magicLinkHashMatches(candidate.tokenHash, token)) return null;
  const now = new Date();
  if (candidate.usedAt || candidate.expiresAt.getTime() <= now.getTime()) return null;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.magicLinkToken.updateMany({
      where: { id: candidate.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now }
    });
    if (claimed.count !== 1) return null;
    return tx.user.findFirst({
      where: { id: candidate.userId, deletedAt: null, suspendedAt: null }
    });
  });
}

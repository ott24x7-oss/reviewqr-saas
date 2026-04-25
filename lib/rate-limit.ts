/**
 * Rate limiter. Falls back to in-memory; uses Prisma RateLimit table
 * when DATABASE_URL is configured for cross-instance correctness.
 *
 * Use the in-memory map for the public review page burst protection
 * (it's local to each Railway replica, but spam usually comes from
 * the same IP) and the DB for cross-replica counters where needed.
 */
import { prisma } from "./db";

type Bucket = { count: number; expiresAt: number };
const memory = new Map<string, Bucket>();

export type RateLimitOpts = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export async function rateLimit({ key, limit, windowSeconds }: RateLimitOpts) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // Memory check first (fast-path)
  const existing = memory.get(key);
  if (existing && existing.expiresAt > now) {
    if (existing.count >= limit) {
      return {
        ok: false as const,
        remaining: 0,
        retryAfter: Math.ceil((existing.expiresAt - now) / 1000)
      };
    }
    existing.count += 1;
    return { ok: true as const, remaining: limit - existing.count };
  }

  memory.set(key, { count: 1, expiresAt: now + windowMs });
  // Lazy cleanup
  if (memory.size > 5000) {
    for (const [k, v] of memory) {
      if (v.expiresAt < now) memory.delete(k);
    }
  }
  return { ok: true as const, remaining: limit - 1 };
}

export async function rateLimitDb({ key, limit, windowSeconds }: RateLimitOpts) {
  const expiresAt = new Date(Date.now() + windowSeconds * 1000);
  try {
    const row = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt },
      update: { count: { increment: 1 } }
    });
    if (row.expiresAt < new Date()) {
      // expired, reset
      await prisma.rateLimit.update({
        where: { key },
        data: { count: 1, expiresAt }
      });
      return { ok: true as const, remaining: limit - 1 };
    }
    if (row.count > limit) {
      return {
        ok: false as const,
        remaining: 0,
        retryAfter: Math.ceil((row.expiresAt.getTime() - Date.now()) / 1000)
      };
    }
    return { ok: true as const, remaining: limit - row.count };
  } catch {
    // Fall back to in-memory if DB hiccups
    return rateLimit({ key, limit, windowSeconds });
  }
}

/**
 * Verify Cloudflare Turnstile (preferred over reCAPTCHA in India for
 * faster load and no Google dependency).
 */
export async function verifyTurnstile(token: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, error: "missing_token" };
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });
  const json = await res.json().catch(() => ({}));
  return { ok: !!json.success, error: json["error-codes"]?.[0] };
}
